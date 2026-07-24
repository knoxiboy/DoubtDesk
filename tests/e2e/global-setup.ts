import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate (stub)', async ({ page, context }) => {
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  // STUB: skip real Clerk login, inject a fake session cookie
  // TODO: replace with real login once Clerk test account is sorted
  await context.addCookies([
    {
      name: '__session',
      value: 'MOCK_SESSION_TOKEN',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.goto('/');
  await context.storageState({ path: authFile });
});