import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase from default 1mb to 10mb for file uploads
    },
  },
};

export default nextConfig;
