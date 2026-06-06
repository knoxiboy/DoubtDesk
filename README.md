# DoubtDesk

**An AI-powered collaborative classroom platform where students get instant doubt resolution, teachers manage virtual classrooms, and analytics drive better learning outcomes.**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GSSoC 2026](https://img.shields.io/badge/GSSoC-2026-orange.svg)](#)
[![Live Demo](https://img.shields.io/badge/Live-doubt--desk--seven.vercel.app-000?logo=vercel)](https://doubt-desk-seven.vercel.app/)

---

## Table of Contents

- [DoubtDesk](#doubtdesk)
  - [Table of Contents](#table-of-contents)
  - [Problem Statement](#problem-statement)
  - [Solution](#solution)
  - [Features](#features)
    - [AI Doubt Solver](#ai-doubt-solver)
    - [Virtual Classrooms](#virtual-classrooms)
    - [Classroom Analytics](#classroom-analytics)
    - [Moderation and Safety](#moderation-and-safety)
    - [Public Doubt Board](#public-doubt-board)
    - [User Profiles](#user-profiles)
  - [Architecture](#architecture)
  - [Tech Stack](#tech-stack)
  - [Screenshots](#screenshots)
  - [Demo Access](#demo-access)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Environment Variables](#environment-variables)
  - [Project Structure](#project-structure)
  - [Contributing](#contributing)
    - [Quick Start for Contributors](#quick-start-for-contributors)
    - [Commit Message Format](#commit-message-format)
    - [Code Style](#code-style)
  - [Issue Labels and Difficulty Levels](#issue-labels-and-difficulty-levels)
    - [Difficulty Levels (GSSoC)](#difficulty-levels-gssoc)
    - [Category Labels](#category-labels)
  - [Roadmap](#roadmap)
    - [Near-Term (v1.1)](#near-term-v11)
    - [Mid-Term (v1.2)](#mid-term-v12)
    - [Long-Term (v2.0)](#long-term-v20)
  - [Code of Conduct](#code-of-conduct)
  - [Security](#security)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

---

## Problem Statement

Students in colleges and universities face a recurring set of challenges that existing tools fail to address:

- **Doubts go unanswered.** Asking questions in large lectures is intimidating, and instructors are not available around the clock.
- **No structured Q&A channel.** WhatsApp and Telegram groups are chaotic — doubts get buried, and solutions are never archived or searchable.
- **Teachers lack visibility.** Instructors have no data on which topics students struggle with until exam results arrive, which is too late to intervene.
- **Existing platforms miss the mark.** Stack Overflow targets professional developers, not structured academics. ChatGPT lacks classroom context, anonymity, and teacher oversight.

DoubtDesk bridges this gap by combining AI-powered instant solving with real classroom structure, giving students answers in seconds and teachers insights in real time.

---

## Solution

DoubtDesk provides a virtual classroom environment where:

1. **Students ask doubts** via text or image (photo of a handwritten problem).
2. **AI instantly solves** the doubt with step-by-step, simplified, and exam-ready explanations.
3. **Community and teachers** can also answer, creating a layered support system.
4. **Analytics dashboard** surfaces weak topics, peak doubt hours, and resolution rates so teachers can act proactively.
5. **Moderation engine** keeps the platform academic and safe using AI content filtering with an escalating strike system.

---

## Features

### AI Doubt Solver
- Type a question or upload a photo — AI solves it instantly using Groq-accelerated LLMs.
- Structured output: Step-by-step breakdown, simplified explanation, and final answer.
- Interactive follow-ups: click any step to ask for further clarification.
- Full LaTeX rendering for math and science equations via KaTeX.
- Persistent chat history for continuing previous AI sessions.

### Virtual Classrooms
- Teachers create classrooms with unique invite codes.
- Students join using invite codes; recommended classrooms auto-surface by university and year.
- Three doubt channels per class: **AI Solve**, **Community Board**, **Teacher Lane**.
- Role-based views (Student vs Teacher) with distinct capabilities.
- Anonymous posting — students are assigned randomized identifiers (e.g., `Student_A7X`) to encourage participation without fear.

### Classroom Analytics
- **Topic Difficulty Heatmap** — highlights which subjects have the most doubts.
- **Resolution Pulse** — solved vs. pending ratio with circular progress visualization.
- **Peak Activity Timeline** — 24-hour bar chart showing when students are most active.
- **Personal AI Mentor** — per-student weak-topic detection after sufficient engagement.

### Moderation and Safety
- AI-powered content moderation flags abusive, off-topic, or spam content before it is posted.
- 3-strike system with escalating temporary account blocks (3 days for first block, increasing for subsequent violations).
- Full audit trail via moderation logs table for admin review.

### Public Doubt Board
- Open community board (no classroom required) with subject filters.
- Like, reply, and mark doubts as solved.
- Accessible to all authenticated users.

### User Profiles
- Personal dashboard showing doubts asked, replies given, and classrooms joined.
- Activity statistics including helpful votes received.

---

## Architecture

```
Student signs up --> Onboarding (university, year, role)
       |
       v
Joins/Creates a Classroom (via invite code)
       |
       v
+----------------------------------------------+
|  Ask a Doubt (Text or Image Upload)          |
|       |                                      |
|  +----------+--------------+---------------+ |
|  | AI Tab   | Community Tab| Teacher Tab   | |
|  | (Groq)   | (Peer Reply) | (Direct Ask)  | |
|  +----------+--------------+---------------+ |
|       |                                      |
|  Resolution + Follow-up Chat                 |
|       |                                      |
|  Analytics Dashboard (Insights for all)      |
+----------------------------------------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Full-stack React framework with server-side rendering |
| **Language** | TypeScript | Static type safety across the codebase |
| **Authentication** | Clerk | User management, session handling, role-based access |
| **AI Engine** | Groq API (Llama 3.3 / 4) | Ultra-fast LLM inference for doubt solving and moderation |
| **Database** | Neon PostgreSQL | Serverless Postgres with branching and autoscaling |
| **ORM** | Drizzle ORM | Type-safe, SQL-like query builder |
| **Background Jobs** | Inngest | Reliable async workflows and event-driven processing |
| **UI Components** | Tailwind CSS + shadcn/ui | Utility-first styling with accessible component primitives |
| **Math Rendering** | KaTeX | Client-side LaTeX equation rendering |
| **OCR / Vision** | Tesseract.js + Vision LLMs | Image-based doubt input and handwriting recognition |
| **Notifications** | Sonner | Lightweight toast notification system |
| **Deployment** | Vercel | Edge-optimized hosting with CI/CD |

---

## Screenshots

> Screenshots are located in the `screenshots/` directory and will be updated as the UI evolves.

![Landing Page](https://github.com/navyamittal2245/DoubtDesk/blob/c6c7b24540c613b9b71ee825ba36e1b15d7eb617/screenshots/screenshot-1780079477082.png)

![AI Solver](https://github.com/navyamittal2245/DoubtDesk/blob/858dfb0064c6c67287e5892bba0fd4824a591f9a/screenshots/ai%20solver%20ss%20updated.png)

![Classroom View](https://github.com/navyamittal2245/DoubtDesk/blob/858dfb0064c6c67287e5892bba0fd4824a591f9a/screenshots/classroom%20ss%20updated.png)

![Analytics Dashboard](https://github.com/navyamittal2245/DoubtDesk/blob/858dfb0064c6c67287e5892bba0fd4824a591f9a/screenshots/dashboard%20screenshot.png)

---

## Demo Access

A live instance of DoubtDesk is deployed at **[doubt-desk-seven.vercel.app](https://doubt-desk-seven.vercel.app/)**.

To explore the full classroom experience without setting up your own environment, use the sample classroom below after signing in:

| Field | Value |
| :--- | :--- |
| **Classroom Invite Code** | `DNOIRL` |

**Steps to access:**
1. Visit the [live demo](https://doubt-desk-seven.vercel.app/).
2. Sign up or sign in using Clerk authentication.
3. Complete the onboarding flow (select your university, year, and role).
4. Navigate to **Classrooms** and click **Join Classroom**.
5. Enter the invite code `DNOIRL` to join the sample classroom.
6. Explore all features: post a doubt, use the AI solver, view the community board, and check analytics.

> **Note for contributors:** Using the demo classroom is strongly recommended before working on any issue. It provides context for how the platform works end-to-end.

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** (bundled with Node.js)
- **Git**
- API keys for the following services:
  - [Clerk](https://clerk.com) — Authentication
  - [Neon](https://neon.tech) — PostgreSQL database
  - [Groq](https://console.groq.com) — AI inference

### Installation

```bash
# 1. Fork the repository (click Fork on GitHub)

# 2. Clone your fork
git clone https://github.com/<your-username>/DoubtDesk.git
cd DoubtDesk

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env
# Fill in your API keys (see Environment Variables below)

# 5. Start the development server
npm run dev
# Open http://localhost:3000
```

### Docker

Run DoubtDesk in a container using [Docker](https://www.docker.com/) and Docker Compose v2. External services (Neon, Clerk, Groq) are **not** containerized — configure them in `.env` as usual.

**Prerequisites:** Docker Desktop or Docker Engine with Compose v2.

```bash
# 1. Configure environment (required before first run)
cp .env.example .env
# Fill in Neon, Clerk, Groq, and other required keys

# 2. Apply database migrations against your Neon instance (one-time / as needed)
npx drizzle-kit migrate

# 3. Build and run the production image
docker compose build
docker compose up
# Open http://localhost:3000

# Stop containers
docker compose down
```

**Development with hot reload:**

```bash
docker compose --profile dev up app-dev
```

| Topic | Notes |
|-------|-------|
| **Required env vars** | Same as [`.env.example`](.env.example) and [`docs/SETUP.md`](docs/SETUP.md) |
| **Not containerized** | Neon PostgreSQL, Clerk, Groq, Inngest, Upstash, Resend |
| **Clerk redirects** | Use `http://localhost:3000` in Clerk dashboard and `NEXT_PUBLIC_APP_URL` |
| **Build-time vars** | `NEXT_PUBLIC_*` values are baked at image build; rebuild after changing them |
| **Migrations** | Run `npx drizzle-kit migrate` locally before first Docker run |
| **Inngest webhooks** | `/api/inngest` needs a public tunnel (e.g. ngrok) to test background jobs locally |
| **Video generation** | Remotion/ffmpeg may need extra system libraries; test natively if Docker video fails |

### Environment Variables

DoubtDesk relies on several external services (Clerk, Neon, Groq, Inngest, etc.). 

For a complete breakdown of which services are strictly required versus optional, along with a setup verification checklist, please read the **[Local Environment Setup Guide](docs/SETUP.md)**.

> **Security:** Never commit your `.env` file. It is already included in `.gitignore`.

---

## Project Structure

```
DoubtDesk/
├── app/
│   ├── (auth)/              # Clerk authentication pages (sign-in, sign-up)
│   ├── api/                 # API routes
│   │   ├── doubts/          #   Doubt CRUD and like endpoints
│   │   ├── rooms/           #   Classroom creation, joining, management
│   │   ├── analytics/       #   Teacher analytics data endpoints
│   │   ├── ask-ai/          #   AI solver inference endpoint
│   │   ├── profile/         #   User profile data aggregation
│   │   └── inngest/         #   Background job webhook handler
│   ├── ask-ai/              # Standalone AI solver page
│   ├── dashboard/           # Analytics dashboard (teacher + student views)
│   ├── onboarding/          # First-time user onboarding flow
│   ├── profile/             # User profile page
│   ├── public-rooms/        # Public doubt board (no classroom required)
│   ├── rooms/               # Classroom list and individual classroom view
│   ├── layout.tsx           # Root layout (Clerk provider, global styles)
│   └── page.tsx             # Landing page
├── components/              # Reusable UI components
│   ├── ui/                  #   shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── AskAIView.tsx        #   AI solver conversation component
│   ├── AskDoubt.tsx         #   Doubt submission modal
│   ├── DashboardLayout.tsx  #   Authenticated layout wrapper
│   ├── DoubtCard.tsx        #   Doubt display card with actions
│   └── Sidebar.tsx          #   Navigation sidebar
├── configs/
│   ├── db.tsx               # Neon database connection setup
│   └── schema.ts            # Drizzle ORM schema (all tables)
├── lib/
│   ├── moderation.ts        # AI content moderation and strike enforcement
│   ├── email.ts             # Warning and block notification email helpers
│   └── auth-utils.ts        # Authentication utility functions
├── inngest/                 # Background job definitions (Inngest functions)
├── scripts/                 # Developer utility and database migration scripts
├── screenshots/             # Application screenshots for documentation
└── middleware.tsx            # Clerk authentication and route protection middleware
```

---

## Contributing

Contributions are welcome from developers of all experience levels. Whether you are fixing a typo, improving the UI, or building a new feature, your work is valued.

**Before submitting a pull request, please read the full [Contributing Guide](CONTRIBUTING.md).**

### Quick Start for Contributors

1. **Browse open issues** on the [Issues](https://github.com/knoxiboy/DoubtDesk/issues) tab. Filter by `good-first-issue` or `beginner-friendly` labels.
2. **Comment on the issue** to indicate you are working on it.
3. **Fork and clone** the repository.
4. **Join the demo classroom** using invite code `DNOIRL` to understand the product before writing code.
5. **Create a branch** following the naming convention:
   - `feature/add-dark-mode-toggle`
   - `fix/classroom-invite-validation`
   - `docs/update-readme-screenshots`
6. **Make focused changes** with clear, conventional commit messages.
7. **Test locally** using `npm run dev`.
8. **Submit a PR** against the `main` branch.

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
feat: add loading skeleton to AI solver
fix: handle empty classroom state gracefully
docs: add screenshots to README
style: improve mobile responsiveness of classroom cards
refactor: extract doubt card into reusable component
```

### Code Style

- Use TypeScript with proper interfaces — avoid `any` types.
- Follow the existing component structure in `/components` and `/app`.
- Use Tailwind CSS for styling, matching the existing dark theme (slate-950 backgrounds, blue-500/600 accents, glassmorphism patterns).
- Keep components focused: one file, one responsibility.

---

## Issue Labels and Difficulty Levels

### Difficulty Levels (GSSoC)

| Label | Points | Description |
| :--- | :--- | :--- |
| `level 1` | Low | Beginner-friendly tasks: documentation, small UI fixes, adding aria-labels |
| `level 2` | Medium | Intermediate tasks: new API routes, component refactors, feature additions |
| `level 3` | High | Advanced tasks: real-time systems, authentication flows, architectural changes |

### Category Labels

| Label | Description |
| :--- | :--- |
| `good-first-issue` | Small, well-scoped tasks ideal for first-time contributors |
| `beginner-friendly` | Slightly more involved but still approachable with guidance |
| `bug` | Something is broken and needs fixing |
| `enhancement` | New feature or improvement to existing functionality |
| `documentation` | Improvements to README, guides, or inline code comments |
| `frontend` | Changes to UI components, pages, or styling |
| `backend` | Changes to API routes, database queries, or server logic |
| `ai` | Changes to AI prompts, model handling, or content moderation |
| `security` | Security-related fixes or hardening |
| `ui/ux` | User interface and experience improvements |
| `gssoc` | Part of the GirlScript Summer of Code program |
| `priority: high` | Must be resolved urgently |
| `priority: medium` | Should be addressed in the current cycle |
| `priority: low` | Nice to have, no immediate deadline |

---

## Roadmap

The following is a prioritized list of planned enhancements. Contributions toward any of these are welcome.

### Near-Term (v1.1)

| Feature | Description | Status |
| :--- | :--- | :--- |
| Testing framework | Set up Jest and React Testing Library for unit and integration tests | Planned |
| 404 page | Custom not-found page matching the application design system | Open issue |
| Footer component | Consistent footer across all pages with navigation links | Open issue |
| README screenshots | Render inline screenshots with proper markdown image syntax | Open issue |
| Profile page fixes | TypeScript interfaces, stable user lookup, mobile nav, error states | Open issue |

### Mid-Term (v1.2)

| Feature | Description | Status |
| :--- | :--- | :--- |
| Real-time notifications | WebSocket or SSE-based alerts for new doubts, replies, and mentions | Open issue |
| Dark mode toggle | System-aware and manual dark/light mode switching | Open issue |
| Global search | Full-text search across doubts with subject and topic filters | Open issue |
| Helpful upvotes | Allow students to upvote community replies as "helpful" | Open issue |
| Rate limiting | API-level rate limiting to prevent abuse and ensure fair usage | Open issue |
| Separate login flows | Distinct authentication paths for students and teachers | Open issue |

### Long-Term (v2.0)

| Feature | Description | Status |
| :--- | :--- | :--- |
| Multi-language support | Internationalization (i18n) for Hindi, Tamil, Bengali, and other regional languages | Planned |
| Mobile application | React Native or PWA for native mobile experience | Planned |
| Gamification | Points, badges, and leaderboards to reward active participants | Planned |
| Export and reports | Teachers can export classroom analytics as PDF/CSV reports | Planned |
| Admin dashboard | Platform-wide moderation panel for project administrators | Planned |
| AI tutor memory | Persistent context across AI sessions for personalized tutoring | Planned |
| Doubt de-duplication | AI-powered detection of duplicate or similar doubts with auto-linking | Planned |
| Video/voice doubts | Support for audio and short video doubt submissions | Planned |
| Classroom announcements | Teachers can broadcast announcements to all classroom members | Planned |
| Integration with LMS | Connect with Google Classroom, Moodle, or Canvas for roster sync | Planned |

---

## Code of Conduct

We are committed to providing a welcoming and harassment-free experience for everyone. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

**In short:** Be respectful, be constructive, be kind.

---

## Security

If you discover a security vulnerability, please follow the responsible disclosure process described in [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Groq](https://groq.com) for ultra-fast AI inference
- [Clerk](https://clerk.com) for seamless authentication
- [Neon](https://neon.tech) for serverless PostgreSQL
- [shadcn/ui](https://ui.shadcn.com) for accessible UI components
- [GirlScript Summer of Code](https://gssoc.girlscript.tech/) for fostering open-source contributions

---

<p align="center">
  Built for students and teachers everywhere.
</p>
