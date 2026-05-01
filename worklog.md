---
Task ID: 1
Agent: Main Agent
Task: Fix Vercel build error and runtime "Failed to load" errors for Sankalp Result Management System

Work Log:
- Analyzed all project files to identify root causes of two Vercel deployment issues
- Issue 1 (Build Error): `cp: cannot create directory '.next/standalone/.next/': No such file or directory` - caused by `package.json` start script referencing `.next/standalone/server.js` (Docker pattern, not needed for Vercel)
- Issue 2 (Runtime "Failed to load"): Firestore compound queries (`where` + `orderBy` on different fields) require composite indexes that don't exist on the Firebase project, causing all API routes to fail with 500 errors
- Fixed `package.json`: Changed `start` script from `NODE_ENV=production bun .next/standalone/server.js` to `next start`
- Fixed ALL API routes: Removed `.orderBy()` from compound Firestore queries and added JavaScript in-memory sorting instead (avoids need for composite indexes)
- Fixed `firebase-service.ts` client-side: Same compound query fixes for all Client SDK queries and `realtimeService` subscriptions
- Verified `firebase-admin-service.ts`: Already had no compound queries (only `.where()` calls)
- Improved error handling in ALL API routes: Changed generic "Internal server error" to include actual error message for easier Vercel debugging
- Fixed `firebase.ts`: Added proper TypeScript types for `FirebaseApp` and `Firestore`
- Verified build succeeds: `next build` completes cleanly
- Verified lint passes: `eslint .` returns no errors

Stage Summary:
- Build error fixed by removing standalone server reference from package.json
- Runtime error root cause identified: Firestore composite index requirements
- All compound queries fixed across 16+ API route files and firebase-service.ts
- Error handling improved across all API routes
- Build and lint both pass cleanly
- Dev server starts successfully
