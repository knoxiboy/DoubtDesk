# Enhance CI pipeline with required status checks and pre-commit hooks #542

## Description
Strengthen the CI pipeline to catch regressions before review and add pre-commit hooks.

## Problem
The project already has a solid CI foundation: `.github/workflows/test.yml` runs Jest unit tests, `.github/workflows/pr-code-quality.yml` runs typecheck, lint, build, security scan, and dependency audit. However: all quality checks use `continue-on-error: true` so they never actually block PRs; no pre-commit hooks exist (no Husky/lint-staged config); no migration validation step exists; test workflow runs `--passWithNoTests` which hides missing test coverage.

## Proposed Solution
1. Remove `continue-on-error: true` from critical steps (typecheck, lint, build).
2. Add Husky + lint-staged for pre-commit formatting and linting.
3. Add a migration validation step.
4. Document the CI expectations for contributors.

## Files Affected
- `.github/workflows/pr-code-quality.yml` -- remove `continue-on-error` from critical jobs
- `.github/workflows/test.yml` -- consider removing `--passWithNoTests`
- `[NEW] .husky/pre-commit` -- Husky hook
- `package.json` -- add husky, lint-staged config
- `[NEW] .lintstagedrc.js` or in `package.json`

## Implementation Checklist
- [ ] At least typecheck and build steps are blocking (not continue-on-error)
- [ ] Husky + lint-staged is configured for pre-commit checks
- [ ] Migration/schema validation step exists in CI
- [ ] CI failures produce clear feedback for contributors
- [ ] Existing workflows are preserved (no breaking changes to automation)

## Additional Context
This is a **GSSoC'26** contributor issue created from the DoubtDesk market-readiness roadmap.

**Field Details:**
- **Level:** advanced
- **Area:** devops
- **Stack:** Next.js, TypeScript, Drizzle, Neon Postgres, Clerk, Groq, Inngest
- **Labels:** `devops`, `gssoc'26`, `level:advanced`, `testing`, `type:feature`
- **Assignee:** Mohammedsami001
