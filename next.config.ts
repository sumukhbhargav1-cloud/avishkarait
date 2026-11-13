import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel expects Next.js's default build output path, .next.
  experimental: { cpus: 1 },
};

export default nextConfig;
