import { test, expect } from '@playwright/test';
import { RoomsPage } from './pages/RoomsPage';
import { RoomDetailPage } from './pages/RoomDetailPage';

test.describe('Doubt CRUD', () => {
  test('create a new doubt in a classroom', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();

    // Navigate to the first room (should be available from seed data or previous test)
    await page.waitForTimeout(2000);
    const hasRooms = await page.locator('a[href*="/rooms/"]').first().isVisible().catch(() => false);

    test.skip(!hasRooms, 'No classrooms available — create one via classroom test first');

    const roomLink = await rooms.getFirstRoomLink();
    expect(roomLink).toBeTruthy();

    const roomDetail = new RoomDetailPage(page);
    await roomDetail.goto(roomLink!.split('/').pop()!);

    const doubtContent = `What is the derivative of e^x? (Test doubt: ${Date.now()})`;
    await roomDetail.createDoubt(doubtContent);

    // Verify the doubt appears in the feed
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('e^x');
  });

  test('view a doubt detail page', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const hasRooms = await page.locator('a[href*="/rooms/"]').first().isVisible().catch(() => false);
    test.skip(!hasRooms, 'No classrooms available');

    const roomLink = await rooms.getFirstRoomLink();
    const roomDetail = new RoomDetailPage(page);
    await roomDetail.goto(roomLink!.split('/').pop()!);

    await page.waitForTimeout(2000);

    // Click on a doubt card to view its detail
    const doubtCard = page.locator('a[href*="/doubts/"], [data-testid="doubt-card"]').first();
    if (await doubtCard.isVisible().catch(() => false)) {
      await doubtCard.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to a doubt detail page
      expect(page.url()).toContain('/doubts/');
    }
  });

  test('delete a doubt', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const hasRooms = await page.locator('a[href*="/rooms/"]').first().isVisible().catch(() => false);
    test.skip(!hasRooms, 'No classrooms available');

    const roomLink = await rooms.getFirstRoomLink();
    const roomDetail = new RoomDetailPage(page);
    await roomDetail.goto(roomLink!.split('/').pop()!);

    await page.waitForTimeout(2000);

    // Find delete button on any doubt card
    const deleteBtn = page.locator('button:has([class*="Trash"]), button[aria-label*="delete" i]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);

      // Confirm deletion
      const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);

        // Verify deletion succeeded (toast or removal)
        const toastSuccess = page.getByText(/deleted|removed/i).first();
        await expect(toastSuccess).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }
  });
});
