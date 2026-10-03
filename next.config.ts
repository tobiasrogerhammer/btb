import type { NextConfig } from "next";
import os from "node:os";

/** LAN-IP-er slik at telefon-preview (http://<ip>:3000) får lov til /_next/* i dev. */
function lanDevOrigins(): string[] {
  const hosts = new Set<string>();
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        hosts.add(net.address);
      }
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
};

export default nextConfig;
