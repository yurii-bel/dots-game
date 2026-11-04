import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dots/shared", "@dots/game-engine"],
};

export default nextConfig;
