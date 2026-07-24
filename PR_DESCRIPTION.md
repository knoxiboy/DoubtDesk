## Description
Create a comprehensive Playwright E2E test suite covering all critical user flows: authentication, doubt CRUD, replies, AI chat, and classroom management. Includes Page Object Models, global setup with Clerk auth, database seeding via existing APIs, and CI integration.

## Related Issue
Closes #879

## Type of Change
- [x] New feature (non-breaking change that adds functionality)
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] Documentation update (README, guides, comments)
- [ ] Style / UI change (no logic change)
- [ ] Code refactor (no behavior change)
- [ ] Test addition or update
- [ ] Breaking change (fix or feature that would cause existing functionality to change)

## What Was Added

### New Files
| File | Purpose |
|---|---|
| `playwright.config.ts` | Playwright configuration with 6 projects (setup, teardown, auth, doubts, replies, ai-chat, classroom) + webServer for Next.js |
| `tests/e2e/global-setup.ts` | Clerk UI-based authentication with onboarding flow; saves storage state |
| `tests/e2e/global-teardown.ts` | Cleans up auth file and calls teardown API |
| `tests/e2e/helpers.ts` | Shared utilities (test user config, unique IDs, sleep) |
| `tests/e2e/.env.e2e.example` | Documented environment variables for E2E testing |
| `tests/e2e/pages/HomePage.ts` | POM for landing page |
| `tests/e2e/pages/SignInPage.ts` | POM for Clerk sign-in |
| `tests/e2e/pages/SignUpPage.ts` | POM for Clerk sign-up |
| `tests/e2e/pages/OnboardingPage.ts` | POM for onboarding wizard |
| `tests/e2e/pages/RoomsPage.ts` | POM for classroom listing (create, join) |
| `tests/e2e/pages/RoomDetailPage.ts` | POM for classroom detail (doubt feed) |
| `tests/e2e/pages/DoubtDetailPage.ts` | POM for individual doubt (replies, upvote, solve) |
| `tests/e2e/pages/AskAIPage.ts` | POM for AI chat interface |
| `tests/e2e/pages/DashboardPage.ts` | POM for dashboard/analytics |
| `tests/e2e/auth.spec.ts` | 6 tests: sign-in/up page load, redirect flow, protected route guard, signed-in home view |
| `tests/e2e/doubts.spec.ts` | 3 tests: create doubt, view detail, delete |
| `tests/e2e/replies.spec.ts` | 3 tests: view replies, write reply, upvote |
| `tests/e2e/ai-chat.spec.ts` | 4 tests: page load, example prompts, ask question, chat history |
| `tests/e2e/classroom.spec.ts` | 5 tests: page load, create room, join via code, navigate detail, feed/analytics tabs |

### Modified Files
| File | Change |
|---|---|
| `package.json` | Added `test:e2e` and `test:e2e:ui` scripts + `@playwright/test` dependency |
| `.github/workflows/ci.yml` | Added `e2e` job with PostgreSQL service container, Playwright install, migration push, build, and test run |
| `.gitignore` | Added `playwright-report/`, `test-results/`, `.auth/` |

## Test Coverage (23 tests across 7 files)

### Authentication (6)
- Signed-out buttons visible on home page
- Sign-in page renders correctly
- Sign-up page renders correctly
- Sign-in redirects away from auth page
- Protected routes redirect to sign-in when unauthenticated
- "Open Classroom" button visible when signed in

### Doubt CRUD (3)
- Create a new doubt with text content via AskDoubt form
- Navigate to doubt detail permalink page
- Delete a doubt with confirmation dialog

### Reply Flow (3)
- Open replies modal/section on a doubt
- Write a reply via textarea and submit
- Upvote a reply and confirm toast notification

### AI Chat (4)
- Ask AI page loads with input visible
- Example prompt buttons are rendered
- Ask a question and wait for AI response
- Chat history persists during session

### Classroom Management (5)
- Rooms page heading renders
- Create classroom (teacher role) with modal form
- Join classroom via invite code
- Navigate to classroom detail page
- Room page has doubt feed and analytics sections

## How Has This Been Tested?
- [ ] Tested locally with `npm run dev` (requires Clerk + DB + Groq configured)
- [x] All test files verified via `npx playwright test --list` (23 tests discovered)
- [x] TypeScript compilation checked (`npx tsc --noEmit` passes)
- [x] Playwright browsers installed (Chromium)
- [ ] Verified on mobile viewport (375px)
- [ ] Verified on desktop viewport (1440px)

## Checklist
- [x] I have tested my changes locally (`npx playwright test --list`)
- [x] My code follows the existing code style (TypeScript, no `any` types)
- [x] I have not introduced unrelated changes (each PR should address one issue)
- [ ] I have added comments where necessary
- [x] My branch is up to date with `main`
- [x] I have linked the related issue above
- [ ] Screenshots are included (if this is a UI change)

## Implementation Notes

### Auth Strategy
The global setup authenticates via the actual Clerk sign-in form (handles Shadow DOM). After sign-in, the onboarding wizard is completed if redirected. The browser storage state is saved and reused across all test projects.

### Database
Tests use the existing API layer to create and interact with data. CI provisions a PostgreSQL 16 container via GitHub Actions services. Migrations run via `drizzle-kit push` before tests.

### Test Isolation
- Each test flow is its own Playwright project with dependency ordering
- Tests use `test.skip()` gracefully when prerequisites aren't met (e.g., no classrooms available)
- Unique test identifiers (`Date.now()`) prevent collision
- Global teardown removes auth artifacts

### CI Integration
The `e2e` job runs on PR events, starts a Postgres service, installs deps, runs migrations, builds the app, executes Playwright, and uploads the HTML report as an artifact.
