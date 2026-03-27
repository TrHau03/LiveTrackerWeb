import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Removed: output: 'export' to support dynamic routes like /order/[id]
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
