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

    const entries = sitemap();
    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true);
    expect(entries[0].url).toBe("https://doubt-desk-seven.vercel.app");
    expect(entries[0].changeFrequency).toBe("weekly");
    expect(entries[0].priority).toBe(1);
  });

  it("uses the configured site URL without introducing duplicate slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://docs.example.com/";

    const entries = sitemap();

    expect(entries[0].url).toBe("https://docs.example.com");
    expect(entries[1].url).toBe("https://docs.example.com/about");
    expect(entries.every((entry) => !("lastModified" in entry))).toBe(true);
  });
});
