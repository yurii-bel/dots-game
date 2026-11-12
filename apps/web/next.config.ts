import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dots/shared", "@dots/game-engine", "@dots/database"],
};

export default nextConfig;
