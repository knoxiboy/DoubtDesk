import type { Page, Locator } from '@playwright/test';

export class RoomDetailPage {
  readonly page: Page;
  readonly roomName: Locator;
  readonly askDoubtBtn: Locator;
  readonly createDoubtModal: Locator;
  readonly doubtContentInput: Locator;
  readonly doubtCards: Locator;
  readonly membersTab: Locator;
  readonly inviteCodeDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.roomName = page.locator('h1').first();
    this.askDoubtBtn = page.getByRole('button', { name: /ask doubt|new doubt/i }).first();
    this.createDoubtModal = page.locator('form').filter({ has: page.locator('textarea') }).first();
    this.doubtContentInput = page.locator('textarea').first();
    this.doubtCards = page.locator('[data-testid="doubt-card"], article, .doubt-card');
    this.membersTab = page.getByRole('button', { name: /members/i }).first();
    this.inviteCodeDisplay = page.locator('[data-testid="invite-code"], code, .invite-code');
  }

  async goto(roomId: number | string) {
    await this.page.goto(`/rooms/${roomId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async createDoubt(content: string) {
    // Click the ask doubt button / button that opens the form
    const triggerBtn = this.page.locator('button').filter({ hasText: /ask|new|create/i }).first();
    if (await triggerBtn.isVisible()) {
      await triggerBtn.click();
    }

    await this.page.waitForTimeout(800);

    // Fill in the subject input if present
    const subjectInput = this.page.locator('input[placeholder*="subject" i]').first();
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Test Subject');
    }

    // Fill in the content textarea
    const textarea = this.page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    await textarea.fill(content);

    // Submit the form
    const submitBtn = this.page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      // Try the last button in the modal
      const btns = this.page.locator('button').all();
      const allBtns = await btns;
      if (allBtns.length > 0) {
        await allBtns[allBtns.length - 1].click();
      }
    }

    await this.page.waitForTimeout(2000);
  }

  async getInviteCode(): Promise<string | null> {
    const codeEl = this.inviteCodeDisplay.first();
    if (await codeEl.isVisible()) {
      return codeEl.textContent();
    }
    return null;
  }
}
