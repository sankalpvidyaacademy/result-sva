// Firebase Client SDK initialization for Sankalp Result Management System
// Region: asia-south1 (Mumbai)

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

// Check if Firebase is properly configured
export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId)

// Initialize Firebase only if configured (prevent re-initialization in dev mode)
let app
let firestoreDb: ReturnType<typeof getFirestore> | null = null

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    firestoreDb = getFirestore(app)
  } catch (error) {
    console.warn('Firebase initialization failed:', error)
  }
}

export const firestore = firestoreDb
export default app
