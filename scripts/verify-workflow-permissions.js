#!/usr/bin/env node
/**
 * Structural verification script for GitHub Actions workflow permissions.
 *
 * Property 1: All target workflows have a correct top-level permissions block.
 * Validates: Requirements 1.1, 2.1–2.13
 *
 * Uses line-by-line string parsing (no external dependencies required).
 * Looks for `^permissions:` at the start of a line before the `jobs:` line
 * to confirm the block is at the root level, not nested inside a job.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const WORKFLOWS_DIR = path.resolve(__dirname, '../.github/workflows');

/**
 * Expected top-level permissions for each workflow file.
 *
 * 'contents-read' → permissions:\n  contents: read
 * 'empty'         → permissions: {}
 */
const EXPECTED = {
  'test.yml': 'contents-read',
  'pr-code-quality.yml': 'empty',
  'beginner-tags-sync.yml': 'empty',
  'auto-assign-reviewers.yml': 'empty',
  'duplicate-invalid-handler.yml': 'empty',
  'pr-size-labeler.yml': 'empty',
  'pr-merged-handler.yml': 'empty',
  'welcome-bot.yml': 'empty',
  'gssoc-auto-labeler.yml': 'empty',
  'check-star.yml': 'empty',
  'stale-management.yml': 'empty',
  'maintainer-commands.yml': 'empty',
  'assignment-request.yml': 'empty',
  'issue-assigned-handler.yml': 'empty',
};

// ─── Parsing helpers ──────────────────────────────────────────────────────────

/**
 * Parse the top-level `permissions:` block from a YAML file using line-by-line
 * string inspection.  We stop scanning once we hit the `jobs:` key (which marks
 * the end of the top-level section we care about).
 *
 * Returns one of:
 *   { found: false }
 *   { found: true, kind: 'empty' }          — permissions: {}
 *   { found: true, kind: 'contents-read' }  — permissions:\n  contents: read
 *   { found: true, kind: 'other', raw: string }
 */
function parseTopLevelPermissions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let permissionsLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Stop once we reach the top-level `jobs:` key
    if (/^jobs\s*:/.test(line)) {
      break;
    }

    // Found a top-level `permissions:` key
    if (/^permissions\s*:/.test(line)) {
      permissionsLineIndex = i;
      break;
    }
  }

  if (permissionsLineIndex === -1) {
    return { found: false };
  }

  const permLine = lines[permissionsLineIndex];

  // Case 1: inline empty — `permissions: {}`
  if (/^permissions\s*:\s*\{\s*\}/.test(permLine)) {
    return { found: true, kind: 'empty' };
  }

  // Case 2: inline with value — `permissions: read-all` etc. (not our target)
  // Check if there's an inline value after the colon (not just whitespace/comment)
  const inlineValue = permLine.replace(/^permissions\s*:\s*/, '').trim();
  if (inlineValue && inlineValue !== '' && !inlineValue.startsWith('#')) {
    return { found: true, kind: 'other', raw: inlineValue };
  }

  // Case 3: block mapping — look at the next indented lines
  // Collect all indented child lines
  const children = [];
  for (let j = permissionsLineIndex + 1; j < lines.length; j++) {
    const childLine = lines[j];

    // Blank lines are allowed between entries
    if (childLine.trim() === '' || childLine.trim().startsWith('#')) {
      continue;
    }

    // If the line is not indented, we've left the permissions block
    if (!/^\s+/.test(childLine)) {
      break;
    }

    children.push(childLine.trim());
  }

  if (children.length === 0) {
    // `permissions:` with no children — treat as empty
    return { found: true, kind: 'empty' };
  }

  // Check for `contents: read` as the sole child
  if (
    children.length === 1 &&
    /^contents\s*:\s*read\s*$/.test(children[0])
  ) {
    return { found: true, kind: 'contents-read' };
  }

  return { found: true, kind: 'other', raw: children.join(', ') };
}

// ─── Verification ─────────────────────────────────────────────────────────────

let allPassed = true;

console.log('Verifying top-level workflow permissions...\n');

for (const [filename, expectedKind] of Object.entries(EXPECTED)) {
  const filePath = path.join(WORKFLOWS_DIR, filename);

  // Check the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`  FAIL  ${filename}  — file not found at ${filePath}`);
    allPassed = false;
    continue;
  }

  const result = parseTopLevelPermissions(filePath);

  if (!result.found) {
    console.error(`  FAIL  ${filename}  — no top-level permissions: block found`);
    allPassed = false;
    continue;
  }

  if (result.kind !== expectedKind) {
    const got =
      result.kind === 'other'
        ? `other (${result.raw})`
        : result.kind;
    console.error(
      `  FAIL  ${filename}  — expected "${expectedKind}", got "${got}"`
    );
    allPassed = false;
    continue;
  }

  const label =
    expectedKind === 'empty' ? 'permissions: {}' : 'permissions: contents: read';
  console.log(`  PASS  ${filename}  — ${label}`);
}

console.log('');

if (allPassed) {
  console.log('All 14 workflow permission checks passed.');
  process.exit(0);
} else {
  console.error('One or more workflow permission checks FAILED.');
  process.exit(1);
}
