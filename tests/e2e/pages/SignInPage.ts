import type { Page, Locator } from '@playwright/test';

export class SignInPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly signUpLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="identifier"]').first();
    this.passwordInput = page.locator('input[name="password"]').first();
    this.submitBtn = page.locator('button[type="submit"]').first();
    this.signUpLink = page.getByRole('link', { name: /sign up/i }).first();
  }

  async goto() {
    await this.page.goto('/sign-in');
    await this.page.waitForLoadState('networkidle');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.emailInput.fill(email);

    const continueBtn = this.page.locator('button[type="submit"]').first();
    await continueBtn.click();
    await this.page.waitForTimeout(1500);

    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.passwordInput.fill(password);

    await this.submitBtn.click();
  }
}
