import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { Provider } from "./provider";
import { ThemeProvider } from "next-themes";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const AppFont = DM_Sans({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-app',
});

const DEFAULT_SITE_URL = "https://doubt-desk-seven.vercel.app";

function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;

  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
}

const siteUrl = getSiteUrl();

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DoubtDesk | AI Doubt Solver",
    template: "%s | DoubtDesk",
  },
  description:
    "DoubtDesk enables students to solve engineering doubts instantly with AI, join interactive classrooms, and view clear learning analytics.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DoubtDesk",
  },
  keywords: [
    "DoubtDesk",
    "AI doubt solver",
    "engineering education",
    "real-time debugging",
    "classroom analytics",
    "student mentorship",
    "programming help"
  ],
  
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "DoubtDesk | AI Doubt Solver",
    description:
      "DoubtDesk enables students to solve engineering doubts instantly with AI, join interactive classrooms, and view clear learning analytics.",
    url: siteUrl,
    siteName: "DoubtDesk",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "DoubtDesk - AI classroom doubt-solving platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DoubtDesk | AI Doubt Solver",
    description:
      "DoubtDesk enables students to solve engineering doubts instantly with AI, join interactive classrooms, and view clear learning analytics.",
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA"}>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${AppFont.className} min-h-screen flex flex-col scroll-smooth bg-white dark:bg-black text-slate-900 dark:text-slate-50 transition-colors duration-500`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="doubtdesk-theme">
            <Provider>
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </Provider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}