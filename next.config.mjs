n/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "@remotion/bundler",
      "@remotion/renderer",
      "ffmpeg-static",
      "openai",
      "esbuild",
      "google-tts-api",
      "axios",
      "tesseract.js",
      "react-katex",
      "katex",
    ],
  },
};

export default nextConfig;

