import type { NextConfig } from 'next';

/**
 * Set API_PROXY_TARGET (e.g. http://127.0.0.1:4000) to serve the API and the uploaded
 * media through this app's own origin instead of calling the backend directly. Useful
 * behind a single tunnel or reverse proxy: the browser then makes same-origin requests,
 * so no CORS configuration is involved. Pair it with NEXT_PUBLIC_API_URL=/api.
 * Unset — the default — nothing is rewritten and the browser talks to the backend directly.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      { source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiProxyTarget}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
