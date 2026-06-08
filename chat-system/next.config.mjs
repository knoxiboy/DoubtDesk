/**
 * Next.js configuration for chat-system
 * Ensures Turbopack uses the correct root directory
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
};
