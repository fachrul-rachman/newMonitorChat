import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Paksa root Turbopack ke folder project ini
    root: __dirname,
  },
};

export default nextConfig;
