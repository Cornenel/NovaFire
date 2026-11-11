import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Legacy Zoho Jobcard CSVs can exceed Next's default 1 MB action limit.
      bodySizeLimit: "10mb",
    },
  },
  // Avoid Next inferring a parent workspace lockfile outside this app.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
