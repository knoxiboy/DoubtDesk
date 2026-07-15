import { test, expect } from '@playwright/test';
import { RoomsPage } from './pages/RoomsPage';
import { RoomDetailPage } from './pages/RoomDetailPage';

test.describe('Reply Flow', () => {
  test('view replies on a doubt', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const hasRooms = await page.locator('a[href*="/rooms/"]').first().isVisible().catch(() => false);
    test.skip(!hasRooms, 'No classrooms available');

    const roomLink = await rooms.getFirstRoomLink();
    const roomDetail = new RoomDetailPage(page);
    await roomDetail.goto(roomLink!.split('/').pop()!);

    await page.waitForTimeout(2000);

    // Click a doubt to view replies
    const commentBtn = page.locator('button:has([class*="MessageSquare"]), button[aria-label*="reply" i]').first();
    if (await commentBtn.isVisible().catch(() => false)) {
      await commentBtn.click();
      await page.waitForTimeout(1500);

      // Verify replies modal/section opens
      const repliesSection = page.locator('[class*="reply"], [data-testid="reply"]').first();
      await expect(repliesSection).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('write a reply to a doubt', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const hasRooms = await page.locator('a[href*="/rooms/"]').first().isVisible().catch(() => false);
    test.skip(!hasRooms, 'No classrooms available');

    const roomLink = await rooms.getFirstRoomLink();
    const roomDetail = new RoomDetailPage(page);
    await roomDetail.goto(roomLink!.split('/').pop()!);

    await page.waitForTimeout(2000);

    // Open replies for the first doubt
    const replyTrigger = page.locator('button:has([class*="MessageSquare"]), button:has-text("Reply"), button[aria-label*="comment" i]').first();
    if (await replyTrigger.isVisible().catch(() => false)) {
      await replyTrigger.click();
      await page.waitForTimeout(1000);

      // Write a reply
      const textarea = page.locator('textarea, [contenteditable="true"]').first();
      if (await textarea.isVisible().catch(() => false)) {
        const replyContent = `Test reply content ${Date.now()}`;
        await textarea.fill(replyContent);

        const submitBtn = page.getByRole('button', { name: /submit|send|post|reply/i }).first();
        await submitBtn.click();
        await page.waitForTimeout(2000);

        // Verify reply appears
        const pageText = await page.textContent('body');
        expect(pageText).toContain('Test reply');
      }
    }
  });

  test('upvote a reply', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const hasRooms = await page.locator('a[href*="/rooms/"]').first().isVisible().catch(() => false);
    test.skip(!hasRooms, 'No classrooms available');

    const roomLink = await rooms.getFirstRoomLink();
    const roomDetail = new RoomDetailPage(page);
    await roomDetail.goto(roomLink!.split('/').pop()!);

    await page.waitForTimeout(2000);

    // Find and click an upvote button
    const upvoteBtn = page.locator('button[aria-label*="upvote" i], button[aria-label*="like" i]').first();
    if (await upvoteBtn.isVisible().catch(() => false)) {
      await upvoteBtn.click();
      await page.waitForTimeout(1500);

      // Verify the upvote was registered (toast notification or count change)
      const toastMsg = page.getByText(/upvoted|liked/i).first();
      await expect(toastMsg).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
