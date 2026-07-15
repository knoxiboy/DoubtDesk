import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

test.describe('Authentication', () => {
  test('displays sign-in and sign-up buttons when signed out', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i }).first()).toBeVisible();
  });

  test('sign-in page loads with correct elements', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.goto();

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(signIn.emailInput).toBeVisible();
  });

  test('sign-up page loads with correct elements', async ({ page }) => {
    const signUp = new SignUpPage(page);
    await signUp.goto();

    await expect(page).toHaveURL(/\/sign-up/);
    await expect(signUp.emailInput).toBeVisible();
  });

  test('redirects to dashboard after sign-in', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@doubtdesk.dev';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'E2eTestPass123!';

    const signIn = new SignInPage(page);
    await signIn.goto();
    await signIn.signIn(testEmail, testPassword);

    // After successful sign-in, user should be redirected away from sign-in page
    await page.waitForURL(/\/(?!sign-in)/, { timeout: 20000 });
    expect(page.url()).not.toContain('/sign-in');
  });

  test('protected routes redirect to sign-in when unauthenticated', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/dashboard');

    // Should redirect to sign-in
    await page.waitForURL(/\/sign-in/, { timeout: 15000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('home page shows Open Classroom button when signed in', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // When signed in via storageState, the SignedIn block should render
    const openBtn = page.getByRole('link', { name: /open classroom/i }).first();
    await expect(openBtn).toBeVisible();
  });
});
