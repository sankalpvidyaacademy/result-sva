import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: Do NOT use output: "standalone" for Vercel deployments.
  // "standalone" is only for Docker/self-hosted deployments.
  // Vercel has its own serverless build system.
  // output: "standalone",

  // CRITICAL: firebase-admin uses native Node.js modules (gRPC, protobuf, etc.)
  // that cannot be bundled by webpack/turbopack. They must be marked as external
  // so Vercel's serverless runtime can load them properly.
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@google-cloud/storage',
    'google-gax',
    'grpc',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'protobufjs',
    'google-auth-library',
    'gtoken',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
