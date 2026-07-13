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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.dev https://*.clerk.dev https://*.clerk.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.clerk.dev https://*.clerk.com https://*.supabase.co https://api.groq.com https://*.inngest.com wss://*.inngest.com https://neon.tech https://*.neon.tech https://challenges.cloudflare.com",
              "frame-src 'self' https://*.clerk.dev https://*.clerk.com https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "media-src 'self' blob: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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