import type { Page, Locator } from '@playwright/test';

export class AskAIPage {
  readonly page: Page;
  readonly questionInput: Locator;
  readonly sendBtn: Locator;
  readonly responseContainer: Locator;
  readonly chatHistory: Locator;
  readonly examplePrompts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.questionInput = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
    this.sendBtn = page.locator('button[type="submit"], button:has(svg.lucide-send), button:has-text("Send")').first();
    this.responseContainer = page.locator('[data-testid="ai-response"], .markdown-content, .ai-response').first();
    this.chatHistory = page.locator('[data-testid="chat-history"], .chat-history');
    this.examplePrompts = page.locator('button:has-text("Solve"), button:has-text("Explain")');
  }

  async goto() {
    await this.page.goto('/ask-ai');
    await this.page.waitForLoadState('networkidle');
  }

  async askQuestion(question: string) {
    await this.questionInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.questionInput.fill(question);

    await this.sendBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async waitForResponse(timeout = 30000) {
    // Wait for the loading state to disappear and response to appear
    await this.page.waitForFunction(() => {
      const loadingEl = document.querySelector('[class*="loading"], [class*="spinner"]');
      const responseEl = document.querySelector('[class*="markdown"], [class*="response"]');
      return !loadingEl && responseEl;
    }, { timeout });
  }

  async clickExamplePrompt(index = 0) {
    const prompt = this.examplePrompts.nth(index);
    if (await prompt.isVisible()) {
      await prompt.click();
      await this.page.waitForTimeout(500);
    }
  }
}
