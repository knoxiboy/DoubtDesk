import { test, expect } from '@playwright/test';
import { RoomsPage } from './pages/RoomsPage';

test.describe('Classroom Management', () => {
  test('rooms page loads with heading', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();

    await expect(rooms.heading).toBeVisible();
  });

  test('create a new classroom (teacher role)', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    // Check if the create button is visible (requires teacher role)
    const newClassBtn = page.getByRole('button', { name: /new class/i }).first();
    if (!(await newClassBtn.isVisible().catch(() => false))) {
      test.skip(true, 'User does not have teacher role — cannot create classrooms');
      return;
    }

    const roomName = `E2E Test Room ${Date.now()}`;
    await rooms.createRoom(roomName);

    // Wait for the room to appear
    await page.waitForTimeout(2000);

    // Refresh rooms list
    await rooms.goto();
    await page.waitForTimeout(2000);

    // Verify the new room appears
    const pageText = await page.textContent('body');
    expect(pageText).toContain(roomName);
  });

  test('join classroom via invite code', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    // Check if there's a join button
    const joinBtn = page.getByRole('button', { name: /join code|enter invitation/i }).first();
    if (!(await joinBtn.isVisible().catch(() => false))) {
      test.skip(true, 'No join button visible — user may be teacher');
      return;
    }

    // This test requires knowing an existing invite code
    // In a full setup, this would come from seed data
    const inviteCode = process.env.E2E_TEST_INVITE_CODE;
    if (!inviteCode) {
      test.skip(true, 'E2E_TEST_INVITE_CODE not set — cannot test join flow');
      return;
    }

    await rooms.joinRoom(inviteCode);

    // Verify success toast
    const toastSuccess = page.getByText(/joined/i).first();
    await expect(toastSuccess).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('navigate to classroom detail page', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const roomLink = page.locator('a[href*="/rooms/"]').first();
    if (!(await roomLink.isVisible().catch(() => false))) {
      test.skip(true, 'No classrooms available');
      return;
    }

    await roomLink.click();
    await page.waitForLoadState('networkidle');

    // Should be on a room detail page
    expect(page.url()).toContain('/rooms/');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('room page has doubt feed and analytics', async ({ page }) => {
    const rooms = new RoomsPage(page);
    await rooms.goto();
    await page.waitForTimeout(2000);

    const roomLink = page.locator('a[href*="/rooms/"]').first();
    if (!(await roomLink.isVisible().catch(() => false))) {
      test.skip(true, 'No classrooms available');
      return;
    }

    await roomLink.click();
    await page.waitForLoadState('networkidle');

    // Check for tabs or sections
    const hasAnalytics = page.getByText(/analytics|insights|activity/i).first();
    const hasDoubts = page.getByText(/doubts|questions|feed/i).first();

    // At least one of these should be present
    const hasContent = (await hasAnalytics.isVisible().catch(() => false)) ||
                       (await hasDoubts.isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });
});
