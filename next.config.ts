import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local uploads only for now — add remotePatterns here if/when photo
    // storage moves to S3/Cloudinary.
    qualities: [65, 75, 85, 90],
  },
};

export default nextConfig;
