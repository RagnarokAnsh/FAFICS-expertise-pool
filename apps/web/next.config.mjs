/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/apply',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
