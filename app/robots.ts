import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doubtdesk.vercel.app";

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
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
