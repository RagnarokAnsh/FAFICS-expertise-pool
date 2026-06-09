import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained build output (apps/web/.next/standalone) so the frontend can
  // be built off-server and shipped as a minimal runnable bundle.
  output: 'standalone',
  // Trace from the monorepo root so the @fafics/shared workspace package is
  // included in the standalone output.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // When the app is served under a sub-path (e.g. behind nginx at
  // http://host/fafics), set NEXT_PUBLIC_BASE_PATH=/fafics at BUILD time so all
  // routes and assets (/_next, /logo.png, etc.) resolve under that prefix.
  // Leave it unset to serve at the domain root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
};

export default nextConfig;
