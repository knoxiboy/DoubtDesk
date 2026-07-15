import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statsCards: Locator;
  readonly charts: Locator;
  readonly welcomeMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1').first();
    this.statsCards = page.locator('[class*="stat"], [class*="metric"], [class*="kpi"]');
    this.charts = page.locator('[class*="recharts"], [class*="chart"]');
    this.welcomeMessage = page.getByText(/welcome|dashboard/i).first();
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async isLoaded() {
    await this.heading.waitFor({ state: 'visible', timeout: 15000 });
    return this.heading.isVisible();
  }
}
