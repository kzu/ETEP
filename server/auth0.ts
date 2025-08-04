import { Router, RequestHandler } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as Auth0Strategy } from "passport-auth0";
import { storage } from "./storage-config";

// Auth0 Strategy Configuration (initialized later)
let auth0Strategy: any = null;

function initializeAuth0Strategy() {
  if (!auth0Strategy) {
    auth0Strategy = new Auth0Strategy(
      {
        domain: process.env.AUTH0_DOMAIN!,
        clientID: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
        callbackURL: process.env.AUTH0_CALLBACK_URL || "/api/callback",
      },
      async (
        accessToken: string,
        refreshToken: string,
        extraParams: any,
        profile: any,
        done: any
      ) => {
    try {
      // Extract user information from Auth0 profile
      const userInfo = {
        id: profile.id,
        email: profile.emails?.[0]?.value || profile.email,
        firstName: profile.name?.givenName || profile.given_name,
        lastName: profile.name?.familyName || profile.family_name,
        profileImageUrl: profile.photos?.[0]?.value || profile.picture,
      };

      // Upsert user in database
      await storage.upsertUser({
        id: userInfo.id,
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        profileImageUrl: userInfo.profileImageUrl,
      });

      // Store tokens in session for potential future use
      const sessionUser = {
        ...userInfo,
        accessToken,
        refreshToken,
        tokenExpiry: extraParams.expires_in
          ? Date.now() + extraParams.expires_in * 1000
          : null,
      };

      done(null, sessionUser);
    } catch (error) {
      console.error("Auth0 authentication error:", error);
      done(error, null);
    }
  }
);
  }
  return auth0Strategy;
}

// Serialize/deserialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Session configuration using in-memory storage - NO PostgreSQL
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemStore = MemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: sessionTtl, // Prune expired entries every week
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // If Auth0 is not configured, return unauthorized
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: "Authentication service unavailable - Auth0 credentials not configured" 
    });
  }

  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // Check if token is expired (if we have token expiry info)
  if (user.tokenExpiry && Date.now() > user.tokenExpiry) {
    // Token is expired, redirect to login
    return res.status(401).json({ message: "Token expired" });
  }

  return next();
};

// Setup authentication routes
export function setupAuth(app: any) {
  // Only initialize Auth0 strategy if credentials are available
  if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET) {
    const strategy = initializeAuth0Strategy();
    passport.use(strategy);
    
    console.log("Auth0 strategy initialized successfully");
    console.log("Registering Auth0 routes: /api/login, /api/callback, /api/logout, /api/auth/user");
    
    // Login route - redirect to Auth0
    app.get("/api/login", passport.authenticate("auth0", {
      scope: "openid email profile"
    }));

    // Callback route - handle Auth0 callback
    app.get("/api/callback", 
      (req: any, res: any, next: any) => {
        console.log("Auth0 callback received:", req.url);
        console.log("Query params:", req.query);
        next();
      },
      passport.authenticate("auth0", { 
        failureRedirect: "/login-error" 
      }),
      (req: any, res: any) => {
        console.log("Auth0 authentication successful, user:", req.user?.email || req.user?.id);
        // Successful authentication, redirect to home
        res.redirect("/");
      }
    );

    // Logout route
    app.get("/api/logout", (req: any, res: any) => {
      const returnTo = `${req.protocol}://${req.get("host")}/`;
      const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
      
      logoutURL.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID!);
      logoutURL.searchParams.set("returnTo", returnTo);
      
      req.logout((err: any) => {
        if (err) {
          console.error("Logout error:", err);
        }
        res.redirect(logoutURL.toString());
      });
    });

    // Get current user route
    app.get("/api/auth/user", isAuthenticated, async (req: any, res: any) => {
      try {
        const sessionUser = req.user as any;
        const user = await storage.getUser(sessionUser.id);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
  } else {
    console.warn("Auth0 credentials not available - authentication routes will not be functional");
    
    // Provide fallback routes that return clear error messages
    app.get("/api/login", (req: any, res: any) => {
      res.status(503).json({ message: "Auth0 not configured" });
    });
    
    app.get("/api/callback", (req: any, res: any) => {
      res.status(503).json({ message: "Auth0 not configured" });
    });
    
    app.get("/api/logout", (req: any, res: any) => {
      res.status(503).json({ message: "Auth0 not configured" });
    });
    
    app.get("/api/auth/user", (req: any, res: any) => {
      res.status(503).json({ message: "Auth0 not configured" });
    });
  }
}

// Validate required environment variables
export function validateAuth0Config() {
  const requiredVars = [
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID", 
    "AUTH0_CLIENT_SECRET",
    "SESSION_SECRET"
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Auth0 environment variables: ${missing.join(", ")}`);
  }
}