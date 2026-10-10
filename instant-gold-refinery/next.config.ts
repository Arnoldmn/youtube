import type { NextConfig } from "next";

// Static export: `npm run build` writes a plain HTML/CSS/JS site to ./out,
// which can be uploaded to any cPanel public_html folder.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
