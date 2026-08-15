import { expect, test } from '@playwright/test';

test('public rooms route renders without authenticated secrets', async ({ request }) => {
  const response = await request.get('/public-rooms');

  expect(response.status()).toBeLessThan(400);
  await expect(response.text()).resolves.toContain('Public Doubts');
});
