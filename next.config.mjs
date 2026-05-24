import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default withPWA(nextConfig);

