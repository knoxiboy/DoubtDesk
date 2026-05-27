# Contributing to DoubtDesk

Thank you for your interest in contributing to DoubtDesk. This guide helps new contributors set up the project, make focused changes, and submit pull requests.

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before participating in the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Exploring the Application](#exploring-the-application)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Need Help?](#need-help)

## Getting Started

Before you begin, make sure you have the following installed:

- Node.js 18 or higher
- npm
- Git

Fork the repository, then clone your fork locally:

```bash
git clone https://github.com/<your-username>/DoubtDesk.git
cd DoubtDesk
```

Add the original repository as the upstream remote:

```bash
git remote add upstream https://github.com/knoxiboy/DoubtDesk.git
```

Keep your local `main` branch updated before creating a new branch:

```bash
git checkout main
git pull upstream main
```

For complete setup details, required services, and environment variables, refer to the [README](./README.md).

## Development Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Fill in the required values in `.env`. The README contains the latest environment variable details and setup notes.

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

Before submitting a pull request, run the available checks:

```bash
npm run lint
npm run build
```

## Exploring the Application

Before writing code, explore the live application to understand the main user flows.

Live demo: [doubt-desk-seven.vercel.app](https://doubt-desk-seven.vercel.app/)

Sample classroom invite code: `DNOIRL`

Suggested flow:

1. Sign up on the live demo.
2. Complete onboarding.
3. Join a classroom using the sample invite code.
4. Post a doubt, try the AI solver, browse the community board, and check the analytics dashboard.

## Branch Naming Convention

Create a new branch for every issue or change. Branch names should be short, descriptive, and use one of these prefixes:

| Prefix | Use for | Example |
| --- | --- | --- |
| `feat/` | New features | `feat/add-search-filter` |
| `fix/` | Bug fixes | `fix/resolve-login-error` |
| `docs/` | Documentation updates | `docs/add-contributing-guide` |
| `refactor/` | Code restructuring without behavior changes | `refactor/simplify-room-layout` |

For this issue, a good branch name is:

```bash
docs/add-contributing-guidelines
```

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

Format:

```text
<type>: <short description>
```

Common commit types:

| Type | Use for | Example |
| --- | --- | --- |
| `feat` | New features | `feat: add room search` |
| `fix` | Bug fixes | `fix: handle empty doubt replies` |
| `docs` | Documentation changes | `docs: add contributing guidelines` |
| `refactor` | Code restructuring | `refactor: simplify auth provider` |
| `style` | Formatting or styling changes | `style: improve mobile spacing` |
| `test` | Test changes | `test: add room page tests` |
| `chore` | Maintenance tasks | `chore: update dependencies` |

Keep commit messages clear, concise, and written in the imperative mood.

## Pull Request Process

> [!IMPORTANT]
> **Repository Star Requirement:** Before raising a pull request, you **must star the DoubtDesk repository**. Our automated CI/CD bots will actively check your GitHub account and block/reject your pull request if you haven't starred the repository. 

1. Make sure your branch is up to date with `main`:

   ```bash
   git checkout main
   git pull upstream main
   git checkout <your-branch-name>
   git rebase main
   ```

2. Push your branch to your fork:

   ```bash
   git push origin <your-branch-name>
   ```

3. Open a pull request against the `main` branch of the original repository.
4. Use a clear PR title that follows the conventional commit format, such as `docs: add contributing guidelines`.
5. In the PR description, include:
   - A short summary of the changes.
   - The related issue number, for example `Closes #39`.
   - Screenshots or screen recordings for UI changes, if applicable.
6. Keep the PR focused on one issue. Do not include unrelated changes.
7. Respond politely to review comments and push follow-up commits to the same branch.

## Code Style Guidelines

- Follow the existing project structure and naming conventions.
- Use TypeScript types where possible and avoid unnecessary `any`.
- Prefer functional React components and hooks.
- Keep components focused and reusable.
- Place shared UI components in `components/`.
- Place shared utilities in `lib/`.
- Use Tailwind CSS consistently with the existing design.
- Make UI changes responsive across mobile, tablet, and desktop.
- Do not include unrelated formatting, refactoring, generated files, or dependency changes in your PR.

## Issue Reporting Guidelines

Before opening a new issue:

1. Search existing issues to avoid duplicates.
2. Use a clear and descriptive title.
3. Explain the problem, expected behavior, and actual behavior.
4. Include steps to reproduce the issue when reporting a bug.
5. Add screenshots, logs, or error messages when helpful.
6. Mention your environment, such as browser, operating system, and Node.js version, if relevant.

For feature requests, describe the use case, the expected behavior, and why the change would help DoubtDesk users.

### Requesting Assignment

If you want to work on an issue, please leave a comment containing the exact phrase `/assign`. 
Our automated bot will acknowledge your request and notify the maintainers. **Please wait for a maintainer to officially assign the issue to you before you start working on it.**

## Need Help?

If you are unsure about anything, comment on the issue you are working on and ask for clarification. Maintainers and contributors are here to help.
