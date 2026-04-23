import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones on the same Wi-Fi to load dev assets while testing PWA /
  // push flows on a real device.
  allowedDevOrigins: ["192.168.0.182"],
};

export default nextConfig;
