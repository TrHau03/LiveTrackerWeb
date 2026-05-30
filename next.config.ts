import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server mode (route handlers enabled — needed for Instagram OAuth code exchange)
  output: "standalone",
};

export default nextConfig;
