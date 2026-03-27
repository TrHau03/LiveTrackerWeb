import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  // Nếu bạn có dùng thẻ <Image /> của Next.js, bạn cần bỏ comment dòng bên dưới
  // images: { unoptimized: true }
};

export default nextConfig;
