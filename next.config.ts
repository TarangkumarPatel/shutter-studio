import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships native binaries — keep it out of the server bundle so
  // Vercel's build traces/copies the right platform binary rather than
  // webpack/Turbopack trying to bundle it.
  serverExternalPackages: ["sharp"],
  images: {
    qualities: [65, 75, 85, 90],
    remotePatterns: [
      // Vercel Blob public storage (see src/lib/storage.ts).
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
