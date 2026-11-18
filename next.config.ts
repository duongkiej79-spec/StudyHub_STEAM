import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Không quảng cáo framework trong header phản hồi.
  poweredByHeader: false,
  // Tailwind CSS v4 qua loader Turbopack (thay cho PostCSS).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Tệp PDF tối đa 10 MB (xem MAX_PDF_BYTES) + phần dư cho các trường form.
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "11mb",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
