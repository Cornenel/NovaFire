import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Legacy Zoho Jobcard CSVs can exceed Next's default 1 MB action limit.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
