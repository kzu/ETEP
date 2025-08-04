// DISABLED - Using Auth0 exclusively, no Replit Auth
// This file is kept for compatibility but should not be used

console.warn("Replit Auth disabled - using Auth0 exclusively");

export function getSession() {
  throw new Error("Replit Auth disabled - use Auth0 session management");
}

export async function setupAuth() {
  throw new Error("Replit Auth disabled - use Auth0 setup");
}

export const isAuthenticated = () => {
  throw new Error("Replit Auth disabled - use Auth0 authentication");
};