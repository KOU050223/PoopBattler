import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.27.117.99"],
};

export default withNextIntl(nextConfig);
