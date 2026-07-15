import type { Page, Locator } from '@playwright/test';

export class OnboardingPage {
  readonly page: Page;
  readonly universityInput: Locator;
  readonly collegeEmailInput: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.universityInput = page.locator('input[placeholder*="university" i]').first();
    this.collegeEmailInput = page.locator('input[type="email"]').first();
    this.submitBtn = page.locator('button[type="submit"]').first();
  }

  async goto() {
    await this.page.goto('/onboarding');
    await this.page.waitForLoadState('networkidle');
  }

  async completeOnboarding(data: {
    university: string;
    collegeEmail: string;
    role?: 'student' | 'teacher';
    year?: string;
  }) {
    await this.universityInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.universityInput.fill(data.university);

    await this.collegeEmailInput.fill(data.collegeEmail);

    if (data.role) {
      const roleBtn = this.page.locator(`label:has-text("${data.role}"), button:has-text("${data.role}")`).first();
      if (await roleBtn.isVisible()) {
        await roleBtn.click();
      }
    }

    if (data.year) {
      const yearSelect = this.page.locator('select').first();
      if (await yearSelect.isVisible()) {
        await yearSelect.selectOption(data.year);
      }
    }

    await this.submitBtn.click();
  }
}
