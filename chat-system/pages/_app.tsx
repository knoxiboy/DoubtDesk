import type { AppProps } from 'next/app';
import '../styles/globals.css';

import { ClerkProvider } from '@clerk/nextjs';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <div className="dark">
        <Component {...pageProps} />
      </div>
    </ClerkProvider>
  );
}
