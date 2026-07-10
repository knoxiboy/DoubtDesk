import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const isDev = process.env.NODE_ENV === "development";

// Clerk's Frontend API host is base64-encoded inside the publishable key
// (`pk_<env>_<base64("<host>$")>`), so it's derived here instead of being
// hardcoded. This keeps the CSP correct for every Clerk instance (local,
// staging, production) without any extra config.
// See: https://clerk.com/docs/guides/how-clerk-works/overview
function getClerkFrontendApiOrigin() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return "";
  try {
    const host = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64")
      .toString("utf-8")
      .replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : "";
  } catch {
    return "";
  }
}

// Doubt/profile images and generated videos are uploaded to Supabase Storage
// server-side and served back to the browser via their public URL, so that
// origin needs to be allow-listed too.
function getSupabaseOrigin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

const clerkFrontendApi = getClerkFrontendApiOrigin();
const supabaseOrigin = getSupabaseOrigin();

// Baseline CSP for a Next.js + Clerk app. 'unsafe-inline' is required for
// script-src/style-src because this repo doesn't use nonce-based Middleware
// (see https://nextjs.org/docs/app/guides/content-security-policy); 'unsafe-eval'
// is added only in development, where React needs it for error overlays.
const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${clerkFrontendApi} https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://img.clerk.com https://ui-avatars.com https://avatars.githubusercontent.com ${supabaseOrigin};
  media-src 'self' ${supabaseOrigin};
  font-src 'self';
  connect-src 'self' ${clerkFrontendApi};
  worker-src 'self' blob:;
  frame-src 'self' https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

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
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
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