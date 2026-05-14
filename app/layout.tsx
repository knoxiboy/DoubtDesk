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
  title: "DoubtDesk - AI Doubt Solver",
  description: "DoubtDesk is an AI-powered collaborative classroom platform where students get instant doubt resolution, teachers manage virtual classrooms, and analytics drive better learning outcomes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={AppFont.className}
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
