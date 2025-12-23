import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Paksa root Turbopack ke folder project ini
    root: __dirname,
  },
  async rewrites() {
    return [
      { source: "/", destination: "/monitorchat" },
      { source: "/login", destination: "/monitorchat/login" },
      { source: "/chat", destination: "/monitorchat/chat" },
      { source: "/api/login", destination: "/monitorchat/api/login" },
      { source: "/api/chat", destination: "/monitorchat/api/chat" },
      { source: "/api/sessions", destination: "/monitorchat/api/sessions" },
    ];
  },
};

export default nextConfig;
