import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev origins for local development
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
