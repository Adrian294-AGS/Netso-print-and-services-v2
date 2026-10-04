import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.22.0.1", "192.168.100.185", "http://localhost:3000"],
  serverExternalPackages: [
    "mysql2",
    "mongoose",
    "google-auth-library",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner"
  ],
  experimental: {
    turbopackFileSystemCacheForDev: true
  },
};

export default nextConfig;
