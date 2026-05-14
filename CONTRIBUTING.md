# Contributing to DoubtDesk

Thank you for your interest in contributing to DoubtDesk. Every contribution matters — whether it is fixing a typo, improving the UI, or building a new feature.

This guide covers everything you need to get started.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Exploring the Application](#exploring-the-application)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Branch Naming](#branch-naming)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Issue Labels](#issue-labels)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- [Need Help?](#need-help)

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** 18 or higher
- **npm** (bundled with Node.js)
- **Git**

If you plan to run the full application locally, you will also need API keys for [Clerk](https://clerk.com), [Neon](https://neon.tech), and [Groq](https://console.groq.com). See the [README](README.md#environment-variables) for details.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/DoubtDesk.git
   cd DoubtDesk
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in the API keys as described in the [README](README.md#environment-variables).
5. **Run the development server:**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

---

## Exploring the Application

Before writing code, it is strongly recommended that you explore the live application to understand how DoubtDesk works end-to-end.

**Live demo:** [doubt-desk-seven.vercel.app](https://doubt-desk-seven.vercel.app/)

**Sample classroom invite code:** `DNOIRL`

Steps:
1. Sign up on the live demo.
2. Complete the onboarding flow.
3. Navigate to Classrooms and join using the invite code `DNOIRL`.
4. Post a doubt, try the AI solver, browse the community board, and check the analytics dashboard.

This hands-on context will make your contributions more informed and effective.

---

## How to Contribute

### Find an Issue

- Browse the [Issues](https://github.com/knoxiboy/DoubtDesk/issues) tab.
- Filter by labels: `good-first-issue`, `beginner-friendly`, `enhancement`, `bug`.
- **Comment on the issue** to indicate you are working on it, so others do not duplicate effort.

### No Issue Exists?

- If you found a bug or have an idea, **open a new issue first**.
- Describe the problem or feature clearly with steps to reproduce (for bugs) or expected behavior (for features).
- Wait for maintainer approval before starting work on large features.

---

## Development Workflow

```
1. Fork the repository
2. Create a feature branch from main
3. Make your changes
4. Test locally (npm run dev)
5. Commit with a clear, conventional message
6. Push to your fork
7. Open a Pull Request against main
```

---

## Branch Naming

Use descriptive, prefixed branch names:

| Prefix | Use Case | Example |
| :--- | :--- | :--- |
| `feature/` | New feature | `feature/add-search-to-doubts` |
| `fix/` | Bug fix | `fix/classroom-invite-code-validation` |
| `docs/` | Documentation | `docs/add-screenshots-to-readme` |
| `style/` | UI/styling changes | `style/improve-mobile-sidebar` |
| `refactor/` | Code refactoring | `refactor/extract-doubt-card-component` |
| `test/` | Adding or updating tests | `test/add-doubt-card-unit-tests` |

---

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
<type>: <short description>
```

**Types:**

| Type | When to Use |
| :--- | :--- |
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `docs` | Documentation changes |
| `style` | UI/CSS changes (no logic change) |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or updating tests |
| `chore` | Build, config, or tooling changes |

**Examples:**
```
feat: add loading skeleton to classroom page
fix: prevent duplicate join on invite code submission
docs: update contribution guide with demo classroom
style: fix mobile alignment on doubt cards
refactor: extract moderation logic into shared utility
```

---

## Pull Request Process

1. **Ensure your branch is up to date** with `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Create the PR** against the `main` branch.

3. **PR title** must follow the commit message format:
   ```
   feat: add search functionality to public doubts page
   ```

4. **PR description** must include:
   - A clear summary of what the change does
   - Related issue number (e.g., `Closes #12`)
   - Screenshots (if there are UI changes)

5. **Keep the PR scoped.** Each PR should address one issue or feature. Do not bundle unrelated changes — this is the most common reason PRs are rejected.

6. **Wait for review.** Maintainers will review within 48 hours. Address any feedback by pushing additional commits to the same branch.

---

## Code Style Guidelines

### TypeScript
- Avoid `any` types wherever possible. Define proper interfaces for all data structures.
- Use `const` by default; use `let` only when reassignment is needed.
- Never use `var`.

### React / Next.js
- Use functional components with hooks.
- Keep components focused — one component per file.
- Place reusable components in `/components`.
- Place page-specific logic in `/app/<route>/page.tsx`.
- Use `"use client"` directive only when client-side interactivity is required.

### Styling
- Use **Tailwind CSS** exclusively. Do not introduce external CSS files.
- Match the existing dark theme: `slate-950` backgrounds, `blue-500`/`blue-600` accents.
- Maintain glassmorphism patterns where applicable (`backdrop-blur`, `border-white/10`).
- Ensure all UI changes are responsive across mobile, tablet, and desktop.

### File Organization

| Type | Location | Example |
| :--- | :--- | :--- |
| API routes | `/app/api/<feature>/route.ts` | `/app/api/doubts/route.ts` |
| Page components | `/app/<route>/page.tsx` | `/app/dashboard/page.tsx` |
| Reusable components | `/components/<ComponentName>.tsx` | `/components/DoubtCard.tsx` |
| UI primitives | `/components/ui/<primitive>.tsx` | `/components/ui/button.tsx` |
| Shared utilities | `/lib/<utility>.ts` | `/lib/moderation.ts` |
| Database schema | `/configs/schema.ts` | — |
| Database connection | `/configs/db.tsx` | — |
| Scripts | `/scripts/<script>.ts` | `/scripts/seed.ts` |

---

## Issue Labels

| Label | Description |
| :--- | :--- |
| `good-first-issue` | Simple, well-scoped. Ideal for first-time contributors. |
| `beginner-friendly` | Slightly more involved, still approachable with guidance. |
| `bug` | Something is broken and needs fixing. |
| `enhancement` | New feature or improvement to existing functionality. |
| `documentation` | README, guides, inline comments. |
| `frontend` | UI components, pages, styling. |
| `backend` | API routes, database, server logic. |
| `ai` | AI prompts, models, moderation. |
| `security` | Security-related fixes or hardening. |
| `ui/ux` | User interface/experience improvements. |
| `gssoc` | Part of the GirlScript Summer of Code program. |
| `level 1` | Easy — beginner-level task. |
| `level 2` | Medium — intermediate-level task. |
| `level 3` | Hard — advanced-level task. |
| `help-wanted` | Maintainer needs assistance on this. |

---

## Common Mistakes to Avoid

These are the most frequent reasons PRs get rejected or require revision:

1. **Scope creep.** Do not bundle unrelated changes (e.g., adding a footer in a "fix typo" PR). Each PR should address exactly one issue.
2. **Using `any` types.** TypeScript exists for a reason. Define interfaces for all data structures.
3. **Breaking previously merged work.** Always check recent PRs and the current `main` branch before modifying shared components.
4. **Undocumented changes.** If your PR touches infrastructure (database config, dependencies, middleware), document it in the PR description.
5. **Dead links or placeholder content.** Do not add links that point to `#` or placeholder text like `example@placeholder.com`. Either link to real destinations or remove them.
6. **Missing mobile responsiveness.** All UI changes must work on mobile viewports (375px and above).
7. **AI-generated artifacts.** Do not include `<think>` blocks, chain-of-thought outputs, or other AI tool artifacts in PRs or code comments.

---

## Need Help?

- **Comment on the issue** — maintainers will respond.
- **Open a Discussion** — for broader questions, architecture proposals, or ideas.
- **Check existing PRs** — someone may have already started similar work.

---

Thank you for helping make DoubtDesk better.
