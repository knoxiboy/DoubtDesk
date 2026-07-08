import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
  // FIX: Force Webpack to use a safer source map generation method in development
  // This completely stops Next.js from injecting `eval()` into your local code.
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },
};

export default withPWA(nextConfig);