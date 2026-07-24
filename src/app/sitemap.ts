import type { MetadataRoute } from "next";

const DEFAULT_SITE_URL = "https://doubt-desk-seven.vercel.app";

function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;
  return (siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`).replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contributors`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/discussions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/roadmaps`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/public-rooms`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/terms-of-service`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
