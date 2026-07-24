import { test as teardown } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

teardown('cleanup test artifacts', async () => {
  // Remove auth file
  if (fs.existsSync(AUTH_FILE)) {
    fs.unlinkSync(AUTH_FILE);
  }

  // Remove test seed data via API
  try {
    const seedUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await fetch(`${seedUrl}/api/e2e/teardown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.E2E_TEARDOWN_SECRET || 'e2e-teardown',
      }),
    }).catch(() => {});
  } catch {
    // Ignore teardown API failures
  }
});
