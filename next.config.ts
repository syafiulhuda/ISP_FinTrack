import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      allowedOrigins: ['10.10.12.158'],
    },
  }
};

export default nextConfig;