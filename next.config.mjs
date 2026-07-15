import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const isDev = process.env.NODE_ENV === "development";
// Same fallback as layout.tsx's <ClerkProvider>, so the CSP stays in sync
// with whichever Clerk instance actually loads. Publishable, not secret.
const CLERK_FALLBACK_PUBLISHABLE_KEY = "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA";

// Clerk's Frontend API host is base64-encoded in the publishable key
// (pk_<env>_<base64("<host>$")>) - derived here so this works for any instance.
function getClerkFrontendApiOrigin() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || CLERK_FALLBACK_PUBLISHABLE_KEY;
  try {
    const host = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64")
      .toString("utf-8")
      .replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : "";
  } catch {
    return "";
  }
}

// Uploaded images/videos are served back from Supabase Storage's public URL.
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

// 'unsafe-inline' is needed since this repo has no nonce-based CSP middleware
// (Next's hydration scripts + Radix's inline styles both rely on it).
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