// Firebase Admin SDK for Server-Side Operations
// Used in API routes for privileged operations that bypass Firestore security rules
// Project: Sankalp Result Management System
// Region: asia-south1 (Mumbai)
//
// Vercel Compatibility Notes:
// - Lazy initialization with promise-based locking to avoid race conditions
// - `preferRest: true` avoids gRPC issues on Vercel serverless
// - Private key handling is robust to Vercel's env var mangling
// - All credentials loaded lazily (not at module import time)
// - firebase-admin is in serverExternalPackages in next.config.ts

// Lazy-load firebase-admin to avoid gRPC initialization at module import time
let _admin: typeof import('firebase-admin') | null = null

async function getAdminModule() {
  if (!_admin) {
    _admin = await import('firebase-admin')
  }
  return _admin
}

// Service account credentials for Admin SDK (loaded from environment variables)
// IMPORTANT: Called lazily at init time, NOT at module level,
// because Vercel populates process.env after module import
function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'sankalp-result-system'
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || ''
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || ''

  // Handle private key: convert escaped \n to actual newlines
  // Vercel dashboard often mangles newlines - they get stored as literal "\n" strings
  let privateKey = rawKey

  // Step 1: Replace escaped \n with actual newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  // Step 2: If the key has no newlines at all, it was probably stripped
  // Try to reconstruct the PEM format
  if (privateKey && !privateKey.includes('\n') && privateKey.includes('-----BEGIN')) {
    // The key is one long line - add newlines at PEM boundaries
    privateKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----\n')
  }

  // Step 3: Validate the key has proper PEM structure
  if (privateKey && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('[firebase-admin] Private key is missing PEM header. Check FIREBASE_PRIVATE_KEY env var.')
  }

  return { projectId, clientEmail, privateKey }
}

// Types for lazy-initialized admin instances
type AdminApp = import('firebase-admin').app.App
type AdminDb = import('firebase-admin').firestore.Firestore
type AdminAuth = import('firebase-admin').auth.Auth

// Lazy-initialized singletons
let adminApp: AdminApp | null = null
let adminDb: AdminDb | null = null
let adminAuth: AdminAuth | null = null

// Promise-based locks to prevent concurrent initialization
let adminAppInitPromise: Promise<AdminApp> | null = null
let adminDbInitPromise: Promise<AdminDb> | null = null
let adminAuthInitPromise: Promise<AdminAuth> | null = null

// Track initialization state for debugging
let initError: string | null = null
let initAttempted = false

async function getAdminApp(): Promise<AdminApp> {
  if (adminApp) return adminApp

  // If initialization is already in progress, wait for it
  if (adminAppInitPromise) return adminAppInitPromise

  adminAppInitPromise = (async () => {
    const admin = await getAdminModule()
    initAttempted = true

    // Reuse existing app if already initialized (e.g., in dev mode hot reload)
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]
      return adminApp
    }

    const serviceAccount = getServiceAccount()

    // Validate required credentials
    if (!serviceAccount.clientEmail) {
      const msg = 'FIREBASE_CLIENT_EMAIL is missing. Set it in Vercel Environment Variables.'
      console.error(`[firebase-admin] ${msg}`)
      initError = msg
      throw new Error(`[firebase-admin] ${msg}`)
    }
    if (!serviceAccount.privateKey) {
      const msg = 'FIREBASE_PRIVATE_KEY is missing. Set it in Vercel Environment Variables.'
      console.error(`[firebase-admin] ${msg}`)
      initError = msg
      throw new Error(`[firebase-admin] ${msg}`)
    }

    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        }),
        projectId: serviceAccount.projectId,
      })
      console.log('[firebase-admin] App initialized successfully for project:', serviceAccount.projectId)
      initError = null
      return adminApp
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown initialization error'
      console.error('[firebase-admin] Failed to initialize app:', msg)
      initError = msg
      // Reset promise so next call retries
      adminAppInitPromise = null
      throw error
    }
  })()

  return adminAppInitPromise
}

export async function getAdminDb(): Promise<AdminDb> {
  if (adminDb) return adminDb

  // If initialization is already in progress, wait for it
  if (adminDbInitPromise) return adminDbInitPromise

  adminDbInitPromise = (async () => {
    const app = await getAdminApp()
    const db = app.firestore()

    try {
      db.settings({
        // CRITICAL for Vercel: Use REST API instead of gRPC
        // gRPC has cold-start and memory issues on Vercel serverless
        preferRest: true,
      })
    } catch {
      // Settings may already be applied in dev mode hot reload — safe to ignore
    }

    adminDb = db
    console.log('[firebase-admin] Firestore initialized (preferRest: true)')
    return adminDb
  })()

  return adminDbInitPromise
}

export async function getAdminAuth(): Promise<AdminAuth> {
  if (adminAuth) return adminAuth

  // If initialization is already in progress, wait for it
  if (adminAuthInitPromise) return adminAuthInitPromise

  adminAuthInitPromise = (async () => {
    const admin = await getAdminModule()
    const app = await getAdminApp()
    adminAuth = admin.auth(app)
    return adminAuth
  })()

  return adminAuthInitPromise
}

// Helper: Create custom token for Firebase Auth
export async function createCustomToken(userId: string, role: string): Promise<string> {
  const auth = await getAdminAuth()
  return auth.createCustomToken(userId, { role })
}

// Helper: Verify custom token
export async function verifyIdToken(idToken: string): Promise<import('firebase-admin').auth.DecodedIdToken> {
  const auth = await getAdminAuth()
  return auth.verifyIdToken(idToken)
}

// Helper: Check if a value looks like a Firestore Timestamp
function isFirestoreTimestamp(obj: unknown): obj is { toDate: () => Date; seconds: number; nanoseconds: number } {
  if (obj === null || obj === undefined || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  // Admin SDK Timestamp has: seconds, nanoseconds, toDate()
  // Internal proto format has: _seconds, _nanoseconds
  return (
    (typeof o.seconds === 'number' && typeof o.nanoseconds === 'number' && typeof o.toDate === 'function') ||
    (typeof o._seconds === 'number' && typeof o._nanoseconds === 'number' && typeof o.toDate === 'function')
  )
}

// Helper: Convert Firestore Timestamps to ISO strings for JSON serialization
function serializeTimestamps(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj

  // Check for Firestore Timestamp (Admin SDK)
  if (isFirestoreTimestamp(obj)) {
    try {
      return (obj as { toDate: () => Date }).toDate().toISOString()
    } catch {
      // Fallback: construct from seconds if toDate fails
      const o = obj as Record<string, unknown>
      const seconds = typeof o.seconds === 'number' ? o.seconds : o._seconds
      if (typeof seconds === 'number') {
        return new Date(seconds * 1000).toISOString()
      }
      return null
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps)
  }

  if (typeof obj === 'object' && obj !== null) {
    // Skip Date objects — they're already valid
    if (obj instanceof Date) {
      return obj.toISOString()
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeTimestamps(value)
    }
    return result
  }

  return obj
}

// Helper: Convert Firestore admin doc to typed object (with Timestamp serialization)
export function docToObj<T extends Record<string, unknown>>(
  snap: import('firebase-admin').firestore.DocumentSnapshot
): T & { id: string } {
  const data = snap.data()

  // Guard: if document doesn't exist, return minimal object with id
  if (!data) {
    return { id: snap.id } as T & { id: string }
  }

  const serialized = serializeTimestamps(data) as Record<string, unknown>
  return { id: snap.id, ...serialized } as T & { id: string }
}

// Helper: Convert Firestore admin query snap to typed objects (with Timestamp serialization)
export function queryToObj<T extends Record<string, unknown>>(
  snap: import('firebase-admin').firestore.QuerySnapshot
): (T & { id: string })[] {
  return snap.docs.map(d => docToObj<T>(d))
}

// ===== Types (shared with client-side) =====
export interface UserDoc {
  id: string
  username: string
  password: string
  role: string // ADMIN, TEACHER, STUDENT
  name: string
  createdAt: unknown
  updatedAt: unknown
}

export interface ClassDoc {
  id: string
  name: string
  createdAt: unknown
}

export interface SubjectDoc {
  id: string
  name: string
  classId: string
  className: string
  createdAt: unknown
}

export interface StudentDoc {
  id: string
  userId: string
  username: string
  name: string
  classId: string
  className: string
  rollNo: string
  subjectIds: string[]
  createdAt: unknown
}

export interface TeacherDoc {
  id: string
  userId: string
  username: string
  name: string
  subjects: {
    id: string
    subjectId: string
    subjectName: string
    classId: string
    className: string
  }[]
  createdAt: unknown
}

export interface TestDoc {
  id: string
  name: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  date: string
  maxMarks: number
  createdAt: unknown
}

export interface MarksDoc {
  id: string
  testId: string
  studentId: string
  studentName: string
  studentRollNo: string
  marks: number
  testInfo: {
    name: string
    date: string
    maxMarks: number
    subjectId: string
    subjectName: string
    classId: string
    className: string
  }
  createdAt: unknown
}

// Export helper to get the admin FieldValue for server timestamps
export async function getFieldValue() {
  const admin = await getAdminModule()
  return admin.firestore.FieldValue
}

// ===== Diagnostic: Get Admin SDK status =====
export function getAdminStatus(): {
  initialized: boolean
  attempted: boolean
  error: string | null
  hasDb: boolean
  envCheck: {
    hasProjectId: boolean
    hasClientEmail: boolean
    hasPrivateKey: boolean
    privateKeyHasPemHeader: boolean
  }
} {
  const sa = getServiceAccount()
  return {
    initialized: adminApp !== null,
    attempted: initAttempted,
    error: initError,
    hasDb: adminDb !== null,
    envCheck: {
      hasProjectId: !!sa.projectId,
      hasClientEmail: !!sa.clientEmail,
      hasPrivateKey: !!sa.privateKey,
      privateKeyHasPemHeader: sa.privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    },
  }
}

// ===== Diagnostic: Test Admin SDK connection =====
export async function testAdminConnection(): Promise<{
  connected: boolean
  message: string
  details?: Record<string, unknown>
}> {
  try {
    const db = await getAdminDb()

    // Try a simple read from the settings collection
    const settingsSnap = await db.collection('settings').limit(1).get()

    // Try a simple read from users to verify data exists
    const usersSnap = await db.collection('users').limit(1).get()

    return {
      connected: true,
      message: 'Firebase Admin SDK connected successfully',
      details: {
        hasSettings: !settingsSnap.empty,
        hasUsers: !usersSnap.empty,
        projectId: getServiceAccount().projectId,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[firebase-admin] Connection test failed:', message)
    return {
      connected: false,
      message: `Firebase Admin SDK connection failed: ${message}`,
      details: getAdminStatus().envCheck,
    }
  }
}
