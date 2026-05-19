import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf2json", "pdfjs-dist"],
};

export default nextConfig;
