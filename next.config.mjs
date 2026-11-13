import { portalLoginUrl, registrationUrl } from './lib/portal-links.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/register/:slug*', destination: registrationUrl, permanent: false },
      ...['/login', '/portal', '/admin/:path*'].map(source => ({ source, destination: portalLoginUrl, permanent: false })),
    ];
  },
  experimental: { cpus: 1 },
};

export default nextConfig;
