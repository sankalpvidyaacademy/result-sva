// Firebase Admin SDK for Server-Side Operations
// Used in API routes for privileged operations that bypass Firestore security rules
// Project: Sankalp Result Management System
// Region: asia-south1 (Mumbai)
//
// NOTE: Lazy initialization to avoid gRPC memory issues in Next.js dev mode.
// The Admin SDK is only initialized when getAdminDb() or getAdminAuth() is called.

// Lazy-load firebase-admin to avoid gRPC initialization at module import time
let _admin: typeof import('firebase-admin') | null = null

async function getAdminModule() {
  if (!_admin) {
    _admin = await import('firebase-admin')
  }
  return _admin
}

// Service account credentials for Admin SDK (loaded from environment variables)
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'sankalp-result-system',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
}

// Types for lazy-initialized admin instances
type AdminApp = import('firebase-admin').app.App
type AdminDb = import('firebase-admin').firestore.Firestore
type AdminAuth = import('firebase-admin').auth.Auth

// Lazy-initialized singletons
let adminApp: AdminApp | null = null
let adminDb: AdminDb | null = null
let adminAuth: AdminAuth | null = null

async function getAdminApp(): Promise<AdminApp> {
  if (!adminApp) {
    const admin = await getAdminModule()
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]
    } else {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'sankalp-result-system',
      })
    }
  }
  return adminApp
}

export async function getAdminDb(): Promise<AdminDb> {
  if (!adminDb) {
    const app = await getAdminApp()
    adminDb = app.firestore()
    try {
      adminDb.settings({
        preferRest: true,
      })
    } catch {
      // Settings may already be applied in dev mode hot reload
    }
  }
  return adminDb
}

export async function getAdminAuth(): Promise<AdminAuth> {
  if (!adminAuth) {
    const app = await getAdminApp()
    adminAuth = admin.auth(app)
  }
  return adminAuth
}

// Helper: Create custom token for Firebase Auth (for Phase 2 auth integration)
export async function createCustomToken(userId: string, role: string): Promise<string> {
  const auth = await getAdminAuth()
  return auth.createCustomToken(userId, { role })
}

// Helper: Verify custom token
export async function verifyIdToken(idToken: string): Promise<import('firebase-admin').auth.DecodedIdToken> {
  const auth = await getAdminAuth()
  return auth.verifyIdToken(idToken)
}

// Helper: Convert Firestore Timestamps to ISO strings for JSON serialization
function serializeTimestamps(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  // Check for Firestore Timestamp by duck-typing to avoid importing admin at module level
  if (typeof obj === 'object' && obj !== null && '_seconds' in obj && '_nanoseconds' in obj && typeof (obj as { toDate: unknown }).toDate === 'function') {
    return (obj as { toDate: () => Date }).toDate().toISOString()
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps)
  }
  if (typeof obj === 'object' && obj !== null) {
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
