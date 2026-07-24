import type { Page, Locator } from '@playwright/test';

export class RoomsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newClassBtn: Locator;
  readonly joinCodeBtn: Locator;
  readonly createModal: Locator;
  readonly joinModal: Locator;
  readonly roomCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /virtual classrooms/i });
    this.newClassBtn = page.getByRole('button', { name: /new class/i });
    this.joinCodeBtn = page.getByRole('button', { name: /join code/i });
    this.createModal = page.locator('form').filter({ has: page.locator('input[placeholder*="Advanced Calculus" i]') }).first();
    this.joinModal = page.locator('form').filter({ has: page.locator('input[placeholder*="invite" i]') }).first();
    this.roomCards = page.locator('a[href*="/rooms/"]');
  }

  async goto() {
    await this.page.goto('/rooms');
    await this.page.waitForLoadState('networkidle');
  }

  async createRoom(name: string, year = '1st Year') {
    await this.newClassBtn.click();
    await this.page.waitForTimeout(500);

    const nameInput = this.page.locator('input[placeholder*="Advanced Calculus" i]').first();
    await nameInput.fill(name);

    const yearSelect = this.page.locator('select').first();
    if (await yearSelect.isVisible()) {
      await yearSelect.selectOption(year);
    }

    const submitBtn = this.page.getByRole('button', { name: /submit/i }).first();
    await submitBtn.click();

    await this.page.waitForTimeout(2000);
  }

  async joinRoom(inviteCode: string) {
    await this.joinCodeBtn.click();
    await this.page.waitForTimeout(500);

    const codeInput = this.page.locator('input[placeholder*="invite" i]').first();
    await codeInput.fill(inviteCode);

    const joinBtn = this.page.getByRole('button', { name: /join/i }).first();
    await joinBtn.click();

    await this.page.waitForTimeout(2000);
  }

  async getFirstRoomLink(): Promise<string | null> {
    const link = this.roomCards.first();
    if (await link.isVisible()) {
      return link.getAttribute('href');
    }
    return null;
  }

  async openFirstRoom() {
    const link = this.roomCards.first();
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }
}
