# Clerk Authentication Issues - Troubleshooting Guide

## Common Error: Token Key ID Mismatch

**Error Message:**
```
"Token verification failed: Unable to find a signing key in JWKS that matches the kid='...' of the provided session token"
```

### Root Cause
The backend is configured to use a different Clerk instance than the frontend. This happens when:

1. **Backend is missing `CLERK_SECRET_KEY`** - The backend can't fetch the correct JWKS
2. **Backend and frontend use different Clerk projects** - They must both point to the same Clerk instance
3. **Keys have been rotated** - Restart the backend to refresh the JWKS cache

### Solution Steps

#### 1. Verify Clerk Configuration
Both frontend and backend must use the **same Clerk project**.

Visit your Clerk Dashboard:
- Go to **API Keys**
- Copy your **Secret Key** (backend) and **Publishable Key** (frontend/backend reference)

#### 2. Update Backend Environment Variables

Create/update `.env` file in `/backend/`:

```bash
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/clouddb
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Important:** The `CLERK_SECRET_KEY` is required on the backend to fetch and validate JWKS.

#### 3. Update Frontend Environment Variables

Create/update `.env` file in `/frontend/`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
VITE_API_URL=http://localhost:5000/api
```

**Note:** The publishable key must match between frontend and backend configuration.

#### 4. Restart Services

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Debugging

The backend now logs additional debugging information when token verification fails:

```json
{
  "tokenKid": "ins_3CXOvS7auz2VkEOKgUEycUYl5yp",
  "clerkSecretKeySet": true,
  "error": "Unable to find a signing key in JWKS..."
}
```

If `clerkSecretKeySet` is `false`, the backend is missing the `CLERK_SECRET_KEY` environment variable.

### Verify it's Working

1. Sign in through the frontend
2. Check browser DevTools → Application → Cookies for `__session` cookie
3. Check backend logs - you should no longer see token verification errors

### Still Having Issues?

1. **Clear browser cookies** and sign out/in again
2. **Restart the backend** to refresh the JWKS cache
3. **Verify Clerk keys** match exactly between `.env` files
4. **Check Clerk API status** at status.clerk.dev
5. **Review Clerk documentation** at clerk.com/docs

