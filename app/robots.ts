import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doubtdesk.vercel.app";

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
