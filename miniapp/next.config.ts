import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["oathlayer-miniapp.robbyn.xyz"],
};

export default nextConfig;
