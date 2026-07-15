/**
 * E2E test helpers for seeding and teardown.
 */

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e-test@doubtdesk.dev',
  password: process.env.E2E_TEST_PASSWORD || 'E2eTestPass123!',
  role: (process.env.E2E_TEST_ROLE || 'teacher') as 'teacher' | 'student',
};

/**
 * Generate a unique test identifier to avoid collisions.
 */
export function uniqueId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Wait for a specified duration (useful for async UI updates).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a toast notification text from the page.
 */
export function parseToastText(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(() => {
    const toast = document.querySelector('[data-sonner-toaster] li');
    return toast?.textContent || null;
  });
}
