import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/profile/",
        "/sign-in/",
        "/sign-up/",
        "/onboarding/",
        "/rooms/",
        "/bookmarks/",
      ],
    },
    sitemap: `${
      process.env.NEXT_PUBLIC_APP_URL || "https://doubt-desk-seven.vercel.app"
    }/sitemap.xml`,
  };
}