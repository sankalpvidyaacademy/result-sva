---
Task ID: 1
Agent: Main
Task: Fix "failed to load classes, teachers, test, students" error on login

Work Log:
- Diagnosed root cause: `api.ts` was routing reads through `firebase-service.ts` (Firebase Client SDK) when `isFirebaseConfigured` was true, but Phase 2 Firestore rules require `request.auth != null` (Firebase Auth)
- The app uses custom auth (session cookies), not Firebase Auth, so all client-side Firestore reads failed with "Missing or insufficient permissions"
- Rewrote `src/lib/api.ts` to route ALL reads and writes through API routes (which use Firebase Admin SDK, bypassing security rules)
- Added PUT handler for tests API route (`src/app/api/tests/[id]/route.ts`)
- Added `FIRESTORE_PREFER_REST=true` and `GOOGLE_CLOUD_DISABLE_GRPC=1` env vars to `.env` to prevent gRPC crashes
- Added try-catch around `adminDb.settings({ preferRest: true })` for dev mode hot reload
- Added favicon reference to layout.tsx metadata
- Verified all API endpoints work: login, classes, teachers, students, tests, subjects
- Verified login with all three roles: Admin (shobhit), Teacher (teacher1), Student (student1)
- Lint passes cleanly

Stage Summary:
- Root cause: Firebase Client SDK reads blocked by Phase 2 Firestore rules (no Firebase Auth)
- Fix: All data access now goes through API routes using Firebase Admin SDK
- All API endpoints return 200 with correct data from Firebase Firestore
- Server may crash with rapid sequential curl requests but works correctly in browser
- Credentials: Admin=shobhit/Shobhit@1502, Teacher=teacher1/teacher123, Student=student1/student123
