import sitemap from "@/app/sitemap";

const siteUrlEnvironmentKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const originalEnvironment = Object.fromEntries(
  siteUrlEnvironmentKeys.map((key) => [key, process.env[key]]),
);

describe("sitemap", () => {
  afterEach(() => {
    for (const key of siteUrlEnvironmentKeys) {
      const originalValue = originalEnvironment[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  });

  it("preserves static route metadata without generated modification dates", () => {
    for (const key of siteUrlEnvironmentKeys) {
      delete process.env[key];
    }

    expect(sitemap()).toEqual([
      { url: "https://doubt-desk-seven.vercel.app", changeFrequency: "weekly", priority: 1 },
      { url: "https://doubt-desk-seven.vercel.app/about", changeFrequency: "monthly", priority: 0.8 },
      { url: "https://doubt-desk-seven.vercel.app/faq", changeFrequency: "monthly", priority: 0.7 },
      { url: "https://doubt-desk-seven.vercel.app/contributors", changeFrequency: "weekly", priority: 0.6 },
      { url: "https://doubt-desk-seven.vercel.app/contact", changeFrequency: "monthly", priority: 0.5 },
      { url: "https://doubt-desk-seven.vercel.app/discussions", changeFrequency: "daily", priority: 0.8 },
      { url: "https://doubt-desk-seven.vercel.app/roadmaps", changeFrequency: "weekly", priority: 0.7 },
      { url: "https://doubt-desk-seven.vercel.app/public-rooms", changeFrequency: "daily", priority: 0.9 },
      { url: "https://doubt-desk-seven.vercel.app/terms-of-service", changeFrequency: "yearly", priority: 0.3 },
      { url: "https://doubt-desk-seven.vercel.app/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    ]);
  });

  it("uses the configured site URL without introducing duplicate slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://docs.example.com/";

    const entries = sitemap();

    expect(entries[0].url).toBe("https://docs.example.com");
    expect(entries[1].url).toBe("https://docs.example.com/about");
    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true);
  });
});
