import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['10.10.12.158', '10.10.12.119', 'localhost:3000'],
  experimental: {
    serverActions: {
      allowedOrigins: ['10.10.12.158', '10.10.12.119', 'localhost:3000'],
    },
  }
};

export default nextConfig;