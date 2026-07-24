import "../app/globals.css";
import type { AppProps } from "next/app";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { DM_Sans } from "next/font/google";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import AnimatedCursor from "@/components/layout/AnimatedCursor";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { KeyboardShortcutsProvider } from "@/components/layout/KeyboardShortcutsProvider";
import { Provider } from "@/app/provider";

const AppFont = DM_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-app",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider
      publishableKey={
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA"
      }
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="doubtdesk-theme"
      >
        <Provider>
          <KeyboardShortcutsProvider>
            <div
              className={`${AppFont.className} min-h-screen flex flex-col scroll-smooth bg-white dark:bg-black text-slate-900 dark:text-slate-50 transition-colors duration-500`}
            >
              <Header />
              <main className="flex-1">
                <Component {...pageProps} />
              </main>
              <ScrollToTopButton />
              <Footer />
              <AnimatedCursor />
              <CommandMenu />
            </div>
          </KeyboardShortcutsProvider>
        </Provider>
      </ThemeProvider>
    </ClerkProvider>
  );
}