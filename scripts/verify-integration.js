#!/usr/bin/env node
/**
 * Integration verification script — runs the three canonical check commands
 * and reports PASS/FAIL for each based on exit code.
 *
 * Property 2: No HIGH or CRITICAL npm audit findings after fixes.
 * Property 4: Build and tests pass after all fixes.
 * Validates: Requirements 3.1, 4.1, 5.4, 6.3, 7.1, 7.2, 7.3
 *
 * Commands verified:
 *   1. npm audit --audit-level=high   — expected exit code 0
 *   2. npm run build                  — expected exit code 0
 *   3. npm run test -- --runInBand    — expected exit code 0
 *
 * Usage:
 *   node scripts/verify-integration.js
 *
 * The script must be run from inside the DoubtDesk/ directory (or the
 * PROJECT_DIR env var can be set to override the working directory).
 *
 * Note: The build command requires several environment variables. If they are
 * not already set in the environment, placeholder values are injected
 * automatically so that Next.js can complete a production build without
 * connecting to real external services.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Working directory for all commands.
 * Defaults to the parent of this script's directory (i.e. DoubtDesk/).
 */
const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(__dirname, '..');

/**
 * Placeholder environment variables required by the Next.js build.
 * These are only injected when the variable is not already present in the
 * environment, so real CI secrets are never overwritten.
 *
 * Values are sourced from .env.example — they are non-functional placeholders
 * that satisfy Next.js's build-time validation without connecting to any
 * external service.
 */
const BUILD_ENV_PLACEHOLDERS = {
  DATABASE_URL:
    'postgresql://user:password@host/database?sslmode=require',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  UNSUBSCRIBE_SECRET: 'placeholder_unsubscribe_secret',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_placeholder',
  CLERK_SECRET_KEY: 'sk_test_placeholder',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  GROQ_API_KEY: 'gsk_placeholder',
  INNGEST_EVENT_KEY: 'placeholder_inngest_event_key',
  INNGEST_SIGNING_KEY: 'placeholder_inngest_signing_key',
  UPSTASH_REDIS_REST_URL: 'https://placeholder.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'placeholder_upstash_token',
};

/**
 * The three integration checks to run, in order.
 *
 * Each entry has:
 *   label       — human-readable name printed in the summary
 *   command     — shell command to execute
 *   env         — additional environment variables to merge (optional)
 *   description — one-line explanation of what is being verified
 */
const CHECKS = [
  {
    label: 'npm audit --audit-level=high',
    command: 'npm audit --audit-level=high',
    description: 'Property 2 — No HIGH or CRITICAL npm audit findings',
  },
  {
    label: 'npm run build',
    command: 'npm run build',
    env: BUILD_ENV_PLACEHOLDERS,
    description: 'Property 4 — Production build completes without errors',
  },
  {
    label: 'npm run test -- --runInBand',
    command: 'npm run test -- --runInBand',
    description: 'Property 4 — All test suites pass without regressions',
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Run a single check and return whether it passed.
 *
 * @param {object} check  - Entry from CHECKS
 * @returns {boolean}     - true if the command exited with code 0
 */
function runCheck(check) {
  // Merge placeholder env vars (only for keys not already set)
  const env = { ...process.env };
  if (check.env) {
    for (const [key, value] of Object.entries(check.env)) {
      if (!env[key]) {
        env[key] = value;
      }
    }
  }

  try {
    execSync(check.command, {
      cwd: PROJECT_DIR,
      env,
      stdio: 'inherit', // stream output directly to the terminal
    });
    return true; // exit code 0
  } catch (err) {
    // execSync throws when the child process exits with a non-zero code
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('='.repeat(60));
console.log('Integration Verification — DoubtDesk Security Fixes');
console.log('='.repeat(60));
console.log(`Working directory: ${PROJECT_DIR}`);
console.log('');

const results = [];

for (const check of CHECKS) {
  console.log('-'.repeat(60));
  console.log(`Running: ${check.label}`);
  console.log(`Verifies: ${check.description}`);
  console.log('');

  const passed = runCheck(check);
  results.push({ label: check.label, passed });

  console.log('');
  console.log(passed ? `  PASS  ${check.label}` : `  FAIL  ${check.label}`);
  console.log('');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));

let allPassed = true;

for (const result of results) {
  const status = result.passed ? 'PASS' : 'FAIL';
  console.log(`  ${status}  ${result.label}`);
  if (!result.passed) {
    allPassed = false;
  }
}

console.log('');

if (allPassed) {
  console.log('All 3 integration checks passed.');
  console.log('');
  console.log(
    'Properties verified:\n' +
      '  Property 2: No HIGH or CRITICAL npm audit findings after fixes\n' +
      '  Property 4: Build and tests pass after all fixes'
  );
  process.exit(0);
} else {
  const failCount = results.filter((r) => !r.passed).length;
  console.error(`${failCount} of ${results.length} integration check(s) FAILED.`);
  process.exit(1);
}
