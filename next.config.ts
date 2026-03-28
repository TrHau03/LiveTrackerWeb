import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Static export for Cloudflare Pages
  // Output directory: out/
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
