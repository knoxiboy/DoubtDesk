import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

setup('authenticate as test user', async ({ page, context }) => {
  const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@doubtdesk.dev';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'E2eTestPass123!';

  // If already authenticated (session cookie present), skip
  await page.goto('/');
  const isAlreadyLoggedIn = await page.evaluate(() =>
    document.cookie.includes('__session')
  );
  if (isAlreadyLoggedIn) {
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  // Step 1: Navigate to sign-in page
  await page.goto('/sign-in');
  await page.waitForTimeout(2000);

  // Step 2: Fill Clerk sign-in form (Clerk uses Shadow DOM, Playwright handles it)
  const emailInput = page.locator('input[name="identifier"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(testEmail);

  const continueBtn = page.locator('button[type="submit"]').first();
  await continueBtn.click();
  await page.waitForTimeout(1500);

  const passwordInput = page.locator('input[name="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(testPassword);

  const signInBtn = page.locator('button[type="submit"]').first();
  await signInBtn.click();

  // Step 3: Wait for redirect to home or onboarding
  await page.waitForURL(/\/$|\/onboarding|\/rooms|\/dashboard/, { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Step 4: Handle onboarding if redirected there
  if (page.url().includes('/onboarding')) {
    await handleOnboarding(page);
  }

  // Step 5: Save storage state (session cookie)
  await page.context().storageState({ path: AUTH_FILE });
});

async function handleOnboarding(page: import('@playwright/test').Page) {
  // Step 1: Fill university
  const universityInput = page.locator('input[placeholder*="university" i]').first();
  if (await universityInput.isVisible()) {
    await universityInput.fill('E2E Test University');
  }

  // Step 2: Fill college email
  const collegeEmailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
  if (await collegeEmailInput.isVisible()) {
    await collegeEmailInput.fill('e2e-test@testuni.edu');
  }

  // Step 3: Select role - choose teacher for classroom creation capability
  const teacherRadio = page.locator('label:has-text("teacher"), button:has-text("teacher"), [role="radio"]:has-text("teacher")').first();
  const studentRadio = page.locator('label:has-text("student"), button:has-text("student"), [role="radio"]:has-text("student")').first();

  const role = process.env.E2E_TEST_ROLE || 'teacher';
  if (role === 'teacher' && (await teacherRadio.isVisible())) {
    await teacherRadio.click();
  } else if (await studentRadio.isVisible()) {
    await studentRadio.click();
  }

  // Step 4: Click submit
  const submitBtn = page.locator('button[type="submit"]').first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
  }

  // Step 5: Wait for redirect to rooms
  await page.waitForURL(/\/rooms/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
}
