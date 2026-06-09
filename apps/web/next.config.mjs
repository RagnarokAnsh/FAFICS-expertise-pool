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
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
};

export default nextConfig;
