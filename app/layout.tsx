import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { Provider } from "./provider";
import Footer from "@/components/Footer";



const AppFont = DM_Sans({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-app',
})
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  title: {
    default: "DoubtDesk | AI Doubt Solver",
    template: "%s | DoubtDesk",
  },
  description:
    "DoubtDesk enables students to solve engineering doubts instantly with AI, join interactive classrooms, and view clear learning analytics.",

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
    url: "/",
    siteName: "DoubtDesk",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${AppFont.className} scroll-smooth`}
        >
          <Provider>
            {children}
            <Footer/>
          </Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
