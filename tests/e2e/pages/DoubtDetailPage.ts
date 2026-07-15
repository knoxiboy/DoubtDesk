import type { Page, Locator } from '@playwright/test';

export class DoubtDetailPage {
  readonly page: Page;
  readonly doubtContent: Locator;
  readonly replyInput: Locator;
  readonly replyBtn: Locator;
  readonly repliesList: Locator;
  readonly upvoteBtns: Locator;
  readonly markSolvedBtn: Locator;
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.doubtContent = page.locator('[data-testid="doubt-content"], article').first();
    this.replyInput = page.locator('textarea, [contenteditable="true"]').first();
    this.replyBtn = page.getByRole('button', { name: /submit|send|reply|post/i }).first();
    this.repliesList = page.locator('[data-testid="reply"], .reply-item, [class*="reply"]');
    this.upvoteBtns = page.locator('[data-testid="upvote"], button[aria-label*="upvote" i], button[aria-label*="like" i]');
    this.markSolvedBtn = page.getByRole('button', { name: /mark.*solved|solve/i }).first();
    this.editBtn = page.getByRole('button', { name: /edit/i }).first();
    this.deleteBtn = page.getByRole('button', { name: /delete/i }).first();
  }

  async goto(doubtId: number | string) {
    await this.page.goto(`/doubts/${doubtId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async writeReply(content: string) {
    await this.replyInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.replyInput.fill(content);
    await this.replyBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async upvoteReply(index = 0) {
    const btn = this.upvoteBtns.nth(index);
    if (await btn.isVisible()) {
      await btn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async markAsSolved() {
    if (await this.markSolvedBtn.isVisible()) {
      await this.markSolvedBtn.click();
      await this.page.waitForTimeout(1500);
    }
  }

  async deleteDoubt() {
    if (await this.deleteBtn.isVisible()) {
      await this.deleteBtn.click();
      await this.page.waitForTimeout(1000);
      const confirmBtn = this.page.getByRole('button', { name: /confirm|delete|yes/i }).first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      await this.page.waitForTimeout(2000);
    }
  }
}
