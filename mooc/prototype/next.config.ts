import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside the ClassProject repository; keep Turbopack rooted here.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
