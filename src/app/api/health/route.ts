import { NextResponse } from 'next/server'
import { getAdminStatus, testAdminConnection } from '@/lib/firebase-admin'

// Health check endpoint for Vercel deployment debugging
// Access via /api/health to diagnose Firebase connection issues
export async function GET() {
  const status = getAdminStatus()

  // If not initialized yet, try a quick connection test
  let connectionTest = null
  if (!status.initialized) {
    connectionTest = await testAdminConnection()
  } else {
    connectionTest = { connected: true, message: 'Already initialized' }
  }

  return NextResponse.json({
    status: status.initialized && connectionTest.connected ? 'ok' : 'error',
    firebase: {
      adminInitialized: status.initialized,
      initAttempted: status.attempted,
      initError: status.error,
      hasDb: status.hasDb,
      connectionTest,
    },
    env: {
      projectId: status.envCheck.hasProjectId,
      clientEmail: status.envCheck.hasClientEmail,
      privateKey: status.envCheck.hasPrivateKey,
      privateKeyPemHeader: status.envCheck.privateKeyHasPemHeader,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
    },
    timestamp: new Date().toISOString(),
  })
}
