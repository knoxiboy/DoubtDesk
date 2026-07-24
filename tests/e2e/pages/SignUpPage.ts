import type { Page, Locator } from '@playwright/test';

export class SignUpPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly continueBtn: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="emailAddress"]').first();
    this.passwordInput = page.locator('input[name="password"]').first();
    this.continueBtn = page.locator('button[type="submit"]').first();
    this.signInLink = page.getByRole('link', { name: /sign in/i }).first();
  }

  async goto() {
    await this.page.goto('/sign-up');
    await this.page.waitForLoadState('networkidle');
  }

  async signUp(email: string, password: string) {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.emailInput.fill(email);

    await this.continueBtn.click();
    await this.page.waitForTimeout(1000);

    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.passwordInput.fill(password);

    await this.continueBtn.click();
  }
}
