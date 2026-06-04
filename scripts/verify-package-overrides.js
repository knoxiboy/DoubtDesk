#!/usr/bin/env node
/**
 * Structural verification script for package.json overrides and devDependencies.
 *
 * Property 3: package.json overrides satisfy minimum version constraints.
 * Validates: Requirements 3.2, 4.2, 5.2, 5.3, 6.2
 *
 * Checks:
 *   - overrides.serialize-javascript satisfies >=7.0.5
 *   - overrides.esbuild satisfies >=0.25.0
 *   - devDependencies.postcss satisfies >=8.5.10
 *
 * Note: overrides.postcss is intentionally absent — it was removed because it
 * conflicted with the direct devDependency (npm EOVERRIDE). The direct
 * devDependency at 8.5.10 covers requirements 5.2 and 5.3.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');

// ─── Load package.json ────────────────────────────────────────────────────────

const pkgPath = path.resolve(__dirname, '../package.json');

if (!fs.existsSync(pkgPath)) {
  console.error(`ERROR: package.json not found at ${pkgPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// ─── Checks ───────────────────────────────────────────────────────────────────

/**
 * Each check describes:
 *   - label:      human-readable name for output
 *   - getValue:   function that returns the version string from package.json
 *                 (or undefined if the key is missing)
 *   - constraint: semver range the version must satisfy
 */
const CHECKS = [
  {
    label: 'overrides.serialize-javascript',
    getValue: () => pkg.overrides && pkg.overrides['serialize-javascript'],
    constraint: '>=7.0.5',
  },
  {
    label: 'overrides.esbuild',
    getValue: () => pkg.overrides && pkg.overrides['esbuild'],
    constraint: '>=0.25.0',
  },
  {
    label: 'devDependencies.postcss',
    getValue: () => pkg.devDependencies && pkg.devDependencies['postcss'],
    constraint: '>=8.5.10',
  },
];

// ─── Verification ─────────────────────────────────────────────────────────────

/**
 * Determine whether a version specifier (which may itself be a range like
 * ">=7.0.5") satisfies a minimum constraint.
 *
 * Strategy:
 *   1. If the specifier is a plain version (e.g. "7.0.5"), use semver.satisfies.
 *   2. If the specifier is a range (e.g. ">=7.0.5"), use semver.subset to check
 *      that every version allowed by the specifier also satisfies the constraint.
 *      This ensures the override cannot resolve to a version below the minimum.
 */
function satisfiesConstraint(specifier, constraint) {
  if (!specifier) return false;

  // Strip leading/trailing whitespace
  const spec = specifier.trim();

  // Try treating it as a concrete version first
  const cleaned = semver.clean(spec);
  if (cleaned) {
    return semver.satisfies(cleaned, constraint);
  }

  // It's a range — check that the range is a subset of the constraint
  // (i.e., every version the range allows also satisfies the constraint)
  try {
    return semver.subset(spec, constraint);
  } catch (_) {
    // semver.subset can throw on unusual range syntax; fall back to minVersion
  }

  // Last resort: check that the minimum version the range can resolve to
  // satisfies the constraint
  const min = semver.minVersion(spec);
  if (min) {
    return semver.satisfies(min, constraint);
  }

  return false;
}

let allPassed = true;

console.log('Verifying package.json overrides and devDependencies...\n');

for (const check of CHECKS) {
  const value = check.getValue();

  if (value === undefined || value === null) {
    console.error(`  FAIL  ${check.label}  — key not found in package.json`);
    allPassed = false;
    continue;
  }

  const passes = satisfiesConstraint(value, check.constraint);

  if (passes) {
    console.log(
      `  PASS  ${check.label}  — "${value}" satisfies ${check.constraint}`
    );
  } else {
    console.error(
      `  FAIL  ${check.label}  — "${value}" does NOT satisfy ${check.constraint}`
    );
    allPassed = false;
  }
}

console.log('');

if (allPassed) {
  console.log('All package.json override checks passed.');
  process.exit(0);
} else {
  console.error('One or more package.json override checks FAILED.');
  process.exit(1);
}
