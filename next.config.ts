import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Use standalone mode for better server deployment compatibility
  // Supports dynamic routes like /order/[id] with minimal bundle size
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
