import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".build",
  // Windows workspace environments can deny concurrent segment-directory creation.
  // Keep static generation predictable in local builds.
  experimental: { cpus: 1 },
};

export default nextConfig;
