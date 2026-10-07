import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "172.27.117.99",
    // 実機検証用の cloudflared HTTPS トンネル（起動ごとにホスト名が変わる）
    "*.trycloudflare.com",
  ],
};

export default withNextIntl(nextConfig);
