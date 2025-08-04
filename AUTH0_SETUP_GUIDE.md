# Auth0 Integration Setup Guide

## Overview
This guide will help you complete the migration from Replit Auth to Auth0 for your ETEP family task management application.

## Auth0 Dashboard Configuration

### 1. Application Settings
In your Auth0 Dashboard, go to **Applications** > **[Your App Name]** > **Settings**:

#### Basic Information
- **Application Type**: Regular Web Application
- **Token Endpoint Authentication Method**: POST

#### Application URIs
Configure these URLs based on your deployment:

**For Custom Domain (replace `your-domain.com` with your actual domain):**
- **Allowed Callback URLs**: 
  ```
  https://your-domain.com/api/callback
  ```
- **Allowed Logout URLs**: 
  ```
  https://your-domain.com/
  ```
- **Allowed Web Origins**: 
  ```
  https://your-domain.com
  ```

**For Replit Development/Testing (replace `your-repl-name` with your actual repl):**
- **Allowed Callback URLs**: 
  ```
  https://your-repl-name.replit.app/api/callback
  ```
- **Allowed Logout URLs**: 
  ```
  https://your-repl-name.replit.app/
  ```
- **Allowed Web Origins**: 
  ```
  https://your-repl-name.replit.app
  ```

**For Multiple Domains (recommended setup):**
You can add both custom domain and Replit URLs separated by commas:
```
https://your-domain.com/api/callback,https://your-repl-name.replit.app/api/callback
```

#### Advanced Settings
- **Grant Types**: Ensure these are enabled:
  - ✅ Authorization Code
  - ✅ Refresh Token
  - ✅ Implicit (optional, for enhanced compatibility)

### 2. Credentials to Collect
From the **Settings** tab, you'll need these three values:

1. **Domain** (e.g., `your-app.auth0.com`)
2. **Client ID** (e.g., `abc123xyz456`)
3. **Client Secret** (click "Show" to reveal)

## Replit Environment Configuration

### Setting Environment Variables
In your Replit project:

1. Click the "Secrets" tab in the left sidebar (🔒 icon)
2. Add these three secrets:

| Key | Value | Example |
|-----|-------|---------|
| `AUTH0_DOMAIN` | Your Auth0 domain | `your-app.auth0.com` |
| `AUTH0_CLIENT_ID` | Your Client ID | `abc123xyz456` |
| `AUTH0_CLIENT_SECRET` | Your Client Secret | `def789ghi012` |

### Important Notes
- **Never share your Client Secret** - it should only be stored in Replit Secrets
- The `SESSION_SECRET` environment variable is already configured
- After adding the secrets, the server will automatically restart

## Custom Domain Configuration

### For Replit Deployments
1. In Replit, go to the **Deployments** tab
2. Configure your custom domain
3. Ensure the Auth0 callback URLs include your custom domain

### For External Hosting
If you plan to host elsewhere:
1. Update the callback URLs in Auth0 to match your hosting domain
2. Ensure environment variables are set in your hosting environment
3. Configure SSL/HTTPS (required for Auth0)

## Testing the Integration

### 1. After Setting Credentials
Once you provide the Auth0 credentials:
1. The server will automatically restart
2. Authentication routes will become functional
3. You can test login at: `https://your-domain.com/api/login`

### 2. Verification Steps
1. **Login Flow**: Visit `/api/login` - should redirect to Auth0
2. **User Profile**: After login, `/api/auth/user` should return user data
3. **Logout**: Visit `/api/logout` - should clear session and redirect

### 3. Troubleshooting
- **"Callback URL mismatch"**: Check Auth0 Allowed Callback URLs
- **"Client credentials not found"**: Verify environment variables in Replit Secrets
- **SSL errors**: Ensure you're using HTTPS URLs only

## Migration Benefits

### Enhanced Security
- ✅ Industry-standard OAuth 2.0 / OpenID Connect
- ✅ Advanced threat protection
- ✅ Configurable password policies
- ✅ Multi-factor authentication support

### Custom Domain Support
- ✅ Works seamlessly with custom domains
- ✅ Professional branded login experience
- ✅ No dependency on Replit-specific authentication

### Scalability
- ✅ Handles high user loads
- ✅ Global CDN for fast login worldwide
- ✅ Advanced user management features

## Next Steps

1. **Provide Auth0 credentials** to complete the integration
2. **Test the authentication flow** after credentials are set
3. **Update any hardcoded URLs** in your application if needed
4. **Configure custom domain** in both Auth0 and Replit
5. **Test production deployment** with your custom domain

The migration maintains all existing user data and family relationships - only the authentication provider changes.