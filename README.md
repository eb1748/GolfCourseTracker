# Golf Course Tracker

A web application for tracking and managing golf course information with optional user authentication for data persistence.

## Project Overview

This application allows users to browse and interact with golf course data. Authentication is **optional** - the app works fully for anonymous users, with login only required for persistent data storage across devices.

## Current Status ✅ FIXED

**RESOLVED**: Authentication system has been updated to support anonymous users.

### ✅ Fixed Issues (2025-09-14):
- `/api/auth/me` now returns `{"user": null}` instead of 401 error for anonymous users
- `/api/courses` and related endpoints now work without authentication
- Frontend gracefully handles unauthenticated users
- App works immediately for anonymous users without requiring login
- Anonymous user data stored in localStorage with option to sync when logging in

### ✅ Current Behavior:
- ✅ Anonymous users can view and interact with golf courses
- ✅ Anonymous users can mark courses as played/want-to-play (stored locally)
- ✅ Anonymous users get full app functionality without login
- ✅ Login provides data persistence across devices and sync capabilities
- ✅ Smooth upgrade path from anonymous to authenticated user

## Tech Stack

- **Backend**: Node.js with Express + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL hosted on Railway
- **ORM**: Drizzle ORM
- **Authentication**: Express-session with PostgreSQL session store
- **UI**: Tailwind CSS + Radix UI components
- **State Management**: TanStack React Query
- **Deployment**: Vercel (frontend) + Railway (database)
- **Originally built by**: Replit

## Database

- **Host**: Railway PostgreSQL
- **Connection**: External URL (nozomi.proxy.rlwy.net:34913)
- **Status**: ✅ Connected and migrations applied successfully

## Environment Variables

### Local Development (.env):
```
DATABASE_URL=postgresql://postgres:password@nozomi.proxy.rlwy.net:34913/railway
```

### Railway Production:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production`

## File Structure

```
├── shared/
│   └── schema.ts          # Database schema definitions
├── server/                # Backend API routes
├── client/                # Frontend application
├── .env                   # Local environment variables
├── drizzle.config.ts      # Drizzle ORM configuration
└── package.json
```

## Getting Started

### Prerequisites
- Node.js installed
- Railway account set up
- PostgreSQL database configured

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
# Copy .env.example to .env and update with your database URL

# Run database migrations (already completed)
npx drizzle-kit push

# Start development server
npm run dev
```

## Development Notes

### Authentication System ✅ UPDATED
- **Type**: Express-session with PostgreSQL session store
- **Status**: ✅ Modified to support optional authentication
- **Anonymous Users**: Full app access with localStorage persistence
- **Authenticated Users**: Cross-device sync + persistent storage
- **Migration Path**: Anonymous data automatically syncs when user logs in

### API Endpoints ✅ UPDATED
- `/api/auth/me` - ✅ Returns `{user: null}` for anonymous users
- `/api/courses` - ✅ Works without authentication (returns courses with default status)
- `/api/courses/search` - ✅ Search courses (anonymous friendly)
- `/api/courses/status/:status` - ✅ Filter by status (anonymous friendly)
- `/api/users/me/stats` - ✅ User statistics (works for anonymous users)
- `/api/courses/:courseId/status` - ✅ Update course status (requires auth for DB, localStorage for anonymous)
- `/api/auth/signin` - Login endpoint
- `/api/auth/signup` - Registration endpoint
- `/api/auth/signout` - Logout endpoint
- `/api/auth/sync` - Sync localStorage data to authenticated account

## Deployment

- **Platform**: Railway
- **Database**: Railway PostgreSQL
- **Status**: ✅ Deployed but needs auth fixes

## Recent Changes (2025-09-14)

### ✅ Authentication System Overhaul
- **Modified middleware**: Changed `requireAuth` to `attachUserIfAuthenticated` on public endpoints
- **Updated `/api/auth/me`**: Now returns `{user: null}` instead of 401 for anonymous users
- **Fixed frontend auth handling**: AuthContext gracefully handles anonymous users
- **Enhanced API routes**: All golf course endpoints work without authentication
- **Preserved user experience**: Anonymous users get full functionality with localStorage persistence

### 🔧 Technical Details
- **Backend**: Updated `server/routes.ts` middleware for anonymous access
- **Frontend**: Modified `AuthContext.tsx` to handle null user state properly
- **Database**: Schema already supported anonymous users - no changes needed
- **Storage**: Dual-mode system (localStorage for anonymous, PostgreSQL for authenticated)

## Next Steps

1. ✅ **~~Fix Authentication~~**: ✅ COMPLETED - Login now optional
2. ✅ **~~Anonymous Access~~**: ✅ COMPLETED - Full browsing without login
3. ✅ **~~Document API~~**: ✅ COMPLETED - All endpoints documented above
4. **Testing**: Verify anonymous and authenticated user flows in production
5. **Performance**: Monitor and optimize for Vercel serverless deployment

## Contributing

This project was originally created by Replit and is being maintained and enhanced.

## Support

For issues with Railway deployment or database connectivity, refer to the Railway dashboard and logs.