import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly signInBtn: Locator;
  readonly signUpBtn: Locator;
  readonly openClassroomBtn: Locator;
  readonly exploreCommunityBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signInBtn = page.locator('a[href="/sign-in"]').first();
    this.signUpBtn = page.locator('a[href="/sign-up"]').first();
    this.openClassroomBtn = page.getByRole('button', { name: /open classroom/i }).first();
    this.exploreCommunityBtn = page.getByRole('button', { name: /explore community/i }).first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async clickSignIn() {
    await this.signInBtn.click();
    await this.page.waitForURL(/\/sign-in/);
  }

  async clickSignUp() {
    await this.signUpBtn.click();
    await this.page.waitForURL(/\/sign-up/);
  }

  async clickOpenClassroom() {
    await this.openClassroomBtn.click();
  }

  async isSignedOut() {
    return this.signInBtn.isVisible();
  }
}
