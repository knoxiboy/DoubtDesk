# DoubtDesk Architecture Documentation

A comprehensive guide to understanding how DoubtDesk is structured and how its components work together.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Folder Structure Guide](#folder-structure-guide)
5. [Data Flow: How a Doubt Travels Through the System](#data-flow-how-a-doubt-travels-through-the-system)
6. [Key Features](#key-features)
7. [Database Schema](#database-schema)
8. [Authentication & Authorization](#authentication--authorization)
9. [API Design](#api-design)
10. [Asynchronous Processing](#asynchronous-processing)
11. [Safety & Moderation](#safety--moderation)
12. [Rate Limiting](#rate-limiting)
13. [Adding New Features](#adding-new-features)

---

## System Overview

DoubtDesk is a full-stack Next.js application that bridges students and teachers through AI-powered doubt resolution. The system is designed with three main layers:

- **Frontend Layer**: React components and pages for students, teachers, and admins
- **Backend API Layer**: Next.js API routes handling business logic and external integrations
- **Data Layer**: PostgreSQL database with Drizzle ORM for type-safe queries

The architecture emphasizes:
- **Scalability**: Classroom-scoped data with multi-tenant support
- **Type Safety**: TypeScript throughout, Drizzle ORM with strict typing
- **Performance**: Rate limiting, efficient queries with indexed columns
- **Safety**: Content moderation, user blocking, audit logging
- **Asynchronous Processing**: Inngest for background jobs (email notifications, AI processing)

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js + React)                   │
│  Pages: Dashboard, Rooms, Profile, Ask AI, Analytics, etc.       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│             API Routes (Backend Business Logic)                  │
│  ├─ /api/doubts         (doubt CRUD + retrieval)                 │
│  ├─ /api/classrooms     (classroom management)                   │
│  ├─ /api/replies        (comment/solution handling)              │
│  ├─ /api/ask-ai         (AI Tutor integration)                   │
│  ├─ /api/analytics      (classroom metrics)                      │
│  ├─ /api/teacher        (teacher tools)                          │
│  └─ /api/user           (profile & preferences)                  │
│                                                                  │
│  Middleware:                                                     │
│  ├─ Clerk Auth (authentication)                                  │
│  ├─ Rate Limiting (API protection)                               │
│  └─ Error Handling (standardized responses)                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │Database │  │ Inngest  │  │ External │
   │(Postgres)  │  Queue   │  │ Services │
   └─────────┘  └──────────┘  │(Groq AI, │
        ▲              │      │ Google   │
        │              ▼      │   TTS)   │
    Drizzle      ┌──────────┐ └──────────┘
     ORM         │Background│
                 │  Jobs    │
                 └──────────┘
```

---

## Core Components

### 1. Frontend (React + Next.js Pages)

The frontend is built as a server-rendered Next.js application with specialized page directories:

**Main Page Directories** (`app/` folder):
- `page.tsx` - Landing/home page
- `(auth)/` - Authentication pages (sign-in, sign-up)
- `(routes)/` - Main app routes wrapped in authenticated layout
  - `dashboard/` - Student/teacher dashboard
  - `rooms/` - Virtual classrooms view
  - `ask-ai/` - AI tutor interface
  - `profile/` - User profile management
  - `bookmarks/` - Saved doubts
  - `public-rooms/` - Public doubt board

**Reusable Components** (`components/` folder):
- `Sidebar.tsx` - Navigation
- `DashboardLayout.tsx` - Main layout wrapper
- `DoubtCard.tsx` - Displays doubt in feed
- `InfiniteDoubtFeed.tsx` - Infinite scroll feed
- `CommandMenu.tsx` - Keyboard shortcuts
- `MarkdownRenderer.tsx` - Renders formatted doubt content
- `ThemeToggle.tsx` - Dark/light mode switcher
- `ExportButton.tsx` - Export options (PDF/Word)
- UI components from `ui/` - Buttons, dialogs, forms, etc.

### 2. Backend API Routes (`app/api/`)

API endpoints follow a RESTful pattern with Clerk authentication:

```
app/api/
├── doubts/
│   ├── route.ts          GET/POST (fetch all, create new)
│   ├── action/
│   │   └── route.ts      POST (like, solve, pin, etc.)
│   └── [id]/
│       └── route.ts      GET/DELETE (specific doubt)
├── replies/
│   ├── route.ts          GET/POST (fetch/create replies)
│   └── [id]/
│       └── route.ts      DELETE (remove reply)
├── classrooms/
│   ├── route.ts          GET/POST (list/create classrooms)
│   └── [id]/
│       └── route.ts      GET/PUT/DELETE (manage classroom)
├── ask-ai/
│   ├── solve/
│   │   └── route.ts      POST (AI doubt solver)
│   ├── chat/
│   │   └── route.ts      POST (conversational tutor)
│   └── shared-chats/
│       └── route.ts      GET (fetch shared chat)
├── analytics/
│   └── route.ts          GET (classroom metrics)
├── teacher/
│   ├── analytics/
│   │   └── route.ts      GET (performance data)
│   └── moderation/
│       └── route.ts      POST (action on violations)
├── user/
│   ├── profile/
│   │   └── route.ts      GET/PUT (profile management)
│   └── preferences/
│       └── route.ts      PUT (notification settings)
└── inngest/
    └── route.ts          POST (webhook for background jobs)
```

### 3. Database (PostgreSQL + Drizzle ORM)

The database uses PostgreSQL with Drizzle ORM for type-safe queries. Configuration:
- Connection: Via `configs/db.tsx` (pooled for performance)
- Schema: Defined in `configs/schema.ts`
- Migrations: Stored in `drizzle/` folder with versioning

**Key Design Patterns:**
- Cascade DELETE for cleanup (e.g., deleting user removes their memberships)
- SET NULL for anonymization (e.g., deleted user's doubts become anonymous)
- Unique constraints for preventing duplicates
- Indexed columns for performance (email, classroom ID, type, subject)

### 4. AI Integration (Groq + Google TTS)

- **Groq AI SDK**: Powers the AI doubt solver and conversational tutor
- **Google TTS API**: Converts text responses to audio
- Integration points:
  - `/api/ask-ai/solve/` - Analyze doubt and generate solution
  - `/api/ask-ai/chat/` - Maintain conversation context
- Rate limited to prevent abuse
- Stored in `lib/ai/` with helper functions

### 5. Asynchronous Processing (Inngest)

Background jobs handled by Inngest:
- Email notifications to teachers/students
- Processing shared chat requests
- Heavy lifting operations

**Location**: `inngest/` folder
- `client.ts` - Inngest client initialization
- `functions.ts` - Job definitions

---

## Folder Structure Guide

```
DoubtDesk/
├── app/                          # Next.js app directory (Pages + API routes)
│   ├── api/                      # Backend API routes
│   ├── (auth)/                   # Auth pages (sign-in, sign-up)
│   ├── (routes)/                 # Protected routes with layout
│   │   ├── dashboard/            # Main dashboard for students/teachers
│   │   ├── rooms/                # Virtual classroom view
│   │   ├── ask-ai/               # AI tutor interface
│   │   ├── profile/              # User profile
│   │   ├── bookmarks/            # Saved doubts
│   │   ├── classrooms/           # Classroom management
│   │   ├── teacher/              # Teacher-specific tools
│   │   └── analytics/            # Analytics dashboard
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── provider.tsx              # Global providers (theme, auth, etc.)
│
├── components/                   # Reusable React components
│   ├── ui/                       # UI primitives (buttons, dialogs, etc.)
│   ├── auth/                     # Auth-related components
│   ├── resume/                   # Resume builder components
│   ├── DashboardLayout.tsx       # Main app layout
│   ├── InfiniteDoubtFeed.tsx     # Infinite scroll feed
│   ├── DoubtCard.tsx             # Doubt display card
│   ├── MarkdownRenderer.tsx      # Markdown to HTML renderer
│   ├── CommandMenu.tsx           # Keyboard command palette
│   └── ... (other components)
│
├── configs/                      # Configuration files
│   ├── db.tsx                    # Database connection pooling
│   ├── schema.ts                 # Drizzle ORM schema definitions
│   └── supabase.tsx              # Supabase client (storage)
│
├── lib/                          # Utility functions and helpers
│   ├── ai/                       # AI-related utilities
│   │   └── categorizer.ts        # Subject/topic categorization
│   ├── auth-utils.ts             # Authentication helpers
│   ├── moderation.ts             # Content moderation logic
│   ├── ratelimit.ts              # Rate limiting setup
│   ├── error-handler.ts          # Standard error responses
│   ├── email.ts                  # Email templates
│   ├── exportPDF.ts              # PDF export logic
│   └── utils.ts                  # General helpers
│
├── hooks/                        # Custom React hooks
│   ├── use-mobile.tsx            # Mobile detection
│   └── use-mobile.ts             # (alternate version)
│
├── inngest/                      # Asynchronous processing
│   ├── client.ts                 # Inngest client setup
│   └── functions.ts              # Background job definitions
│
├── public/                       # Static assets
│   ├── temp-assets/              # Temporary assets
│   └── videos/                   # Video files
│
├── drizzle/                      # Database migrations
│   ├── 0000_bitter_tyger_tiger.sql  # Initial schema
│   ├── 0001_add_doubt_tags.sql      # Tags feature
│   └── meta/                        # Migration metadata
│
├── types/                        # TypeScript type definitions
│
├── __tests__/                    # Jest test files
│   ├── api/                      # API route tests
│   ├── components/               # Component tests
│   └── lib/                      # Utility function tests
│
├── scripts/                      # Utility scripts
│
├── middleware.tsx                # Clerk auth + rate limit middleware
├── next.config.mjs               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── jest.config.ts                # Jest testing configuration
├── postcss.config.js             # PostCSS configuration
└── package.json                  # Dependencies and scripts

docs/                             # Documentation (YOU ARE HERE)
├── ARCHITECTURE.md               # This file
├── CONTRIBUTING.md               # Contribution guidelines
└── ... (other docs)
```

---

## Data Flow: How a Doubt Travels Through the System

### Step 1: Student Submits a Doubt

**Entry Point**: Student navigates to `/ask-ai/` or classroom room

```
User Input (React Form)
    ↓
POST /api/doubts
    ├─ Validate input (Zod schema)
    ├─ Extract user info (Clerk)
    ├─ Categorize doubt using AI (subject + subtopic)
    ├─ Content moderation check (profanity, spam, off-topic)
    ├─ If moderation fails → Log violation, flag doubt as "flagged"
    ├─ Insert doubt into database
    │   └─ Generate unique ID
    │   └─ Set classroom scoping (if applicable)
    │   └─ Store image (if uploaded) → Supabase
    └─ Return doubt with ID to frontend
        ↓
    Frontend shows confirmation
    Student sees doubt in their feed
```

**Database Operation**:
```sql
INSERT INTO doubts (userName, userEmail, classroomId, subject, subTopic, content, imageUrl, type)
VALUES (...)
```

### Step 2: Categorization & Subject Detection

**Component**: `lib/ai/categorizer.ts`

The system categorizes doubts to:
- **Subject**: Math, Physics, Chemistry, Programming, etc.
- **SubTopic**: Specific topic detected by AI (e.g., "Quadratic Equations")

This enables:
- Better search and filtering
- Grouping similar doubts
- Teacher analytics by subject

### Step 3: AI Solver Processing (Optional)

If doubt type is **"ai"**, it triggers AI solving:

```
Doubt Created
    ↓
POST /api/ask-ai/solve
    ├─ Extract doubt content
    ├─ Call Groq AI with doubt context
    ├─ AI generates solution with steps
    ├─ (Optional) Generate audio using Google TTS
    ├─ Store solution as a "reply" with type="solution"
    ├─ Update doubt status to "isSolved": true
    └─ Broadcast to students via WebSocket (if implemented)
        ↓
    Frontend auto-refreshes and shows solution
```

**Integration with Inngest** (optional heavy lifting):
```
Inngest Job Queue
    ├─ Email notification to doubt creator
    ├─ Notify teacher if in classroom
    ├─ Log analytics event
    └─ Update teacher dashboard
```

### Step 4: Community Solving

If doubt type is **"community"**, students/teachers can reply:

```
Student writes reply
    ↓
POST /api/replies
    ├─ Validate reply content
    ├─ Moderation check
    ├─ Store reply in database
    │   └─ Associate with doubt ID
    │   └─ Mark type as "comment" or "solution"
    └─ Return reply to frontend
        ↓
    Frontend appends reply to doubt feed
    Other students can see and upvote
```

**Teacher Can Mark As Solution**:
```
Teacher views reply
    ↓
POST /api/doubts/action (action: "solve")
    ├─ Verify teacher permissions (classroom membership)
    ├─ Update doubt.solvedReplyId = reply.id
    ├─ Set doubt.isSolved = "solved"
    └─ Notify all students viewing the doubt
```

### Step 5: Student Bookmarks or Likes

```
User Interaction
    ├─ Like doubt
    │   └─ POST /api/doubts/action (action: "like")
    │       ├─ Insert into likes table
    │       └─ Increment doubt.likes
    │
    └─ Bookmark doubt
        └─ POST /api/bookmarks
            ├─ Insert into bookmarks table
            └─ Frontend shows bookmark icon
```

### Step 6: Analytics & Reporting

```
Teacher Dashboard Access
    ↓
GET /api/analytics (classroomId)
    ├─ Query: COUNT(doubts) by subject
    ├─ Query: AVG(time_to_solve) per doubt
    ├─ Query: Doubts by difficulty (based on response count)
    └─ Return metrics for charting
        ↓
    Dashboard displays:
        ├─ Subject distribution (pie chart)
        ├─ Solve time trends (line chart)
        ├─ Top students & helpers
        └─ Unsolved doubt alerts
```

---

## Key Features

### 1. Virtual Classrooms

**What**: Teachers can create isolated spaces for their classes

**Database Tables**:
- `classrooms` - Classroom metadata
- `memberships` - Many-to-many user-classroom relationship

**Flow**:
1. Teacher creates classroom → Generates unique invite code
2. Students join via code → Inserted into memberships
3. Doubts posted in room are scoped to `classroomId`
4. Only members can view/participate
5. When classroom deleted → Doubts become public (SET NULL)

**Security**:
- Membership check on every API call
- Role-based access (student/teacher/admin)
- Separate analytics per classroom

### 2. Moderation & Safety

**Purpose**: Protect community from harassment, spam, and harmful content

**Components**:
- `lib/moderation.ts` - Profanity detection, spam filtering
- `moderationLogsTable` - Audit trail of violations
- `usersTable.violationCount` - Track repeat offenders

**Flow**:
```
Doubt/Reply Posted
    ↓
Run moderation checks:
    ├─ Profanity filter
    ├─ Spam detection
    ├─ Off-topic detection
    └─ Toxicity scoring
    ↓
If violation detected:
    ├─ Log violation (moderationLogsTable)
    ├─ Increment user.violationCount
    ├─ Mark content as flagged (pending admin review)
    ├─ If violationCount ≥ 3:
    │   └─ Block user for 48 hours (user.isBlocked = true)
    └─ Notify admin
        ↓
Admin actions:
    ├─ Approve content → Remove flag
    ├─ Remove content → Delete from database
    └─ Warn/suspend user
```

**Escalation**:
- **Level 1**: 1 violation → Warning
- **Level 2**: 2 violations → 24h block
- **Level 3**: 3+ violations → 48h+ block, manual review

### 3. Analytics Dashboard

**For Teachers**: Understand student learning patterns

**Metrics Tracked**:
- Doubts by subject
- Average resolution time
- Most active students
- Trending topics
- Unsolved doubt alerts

**Aggregation**:
- Classroom-level rollup
- Subject-level breakdown
- Time-series trends

### 4. Bookmarks System

**Purpose**: Students can save doubts for later study

**Flow**:
1. Student clicks bookmark icon on doubt
2. POST `/api/bookmarks` inserts into `bookmarks` table
3. Frontend fetches `/bookmarks` route to show saved doubts
4. Cascade delete when doubt removed

---

## Database Schema

### Core Tables

**users**
- Stores user profile and security info
- Role: student, teacher, admin
- Moderation fields: violationCount, isBlocked, blockedUntil

**classrooms**
- Created by teachers
- Each has unique invite code
- Contains: name, university, year, teacherEmail

**memberships**
- Links users to classrooms
- Roles per classroom: student, teacher, admin
- Unique constraint: one membership per user per classroom

**doubts**
- Core table storing student questions
- Status: unsolved, solved
- Type: ai, community, teacher
- Scoped by classroomId (null for public)
- Categorization: subject, subTopic
- Media: imageUrl (stored in Supabase)

**replies**
- Responses to doubts
- Type: comment, solution
- Can be upvoted
- Cascade deleted with parent doubt

**tags**
- Metadata labels for doubts
- Classroom-scoped or global
- Normalized name for search

**doubt_tags**
- Many-to-many relationship
- Links doubts to tags

**chat_history**
- Persistent AI conversation state
- Allows continuing chat sessions
- Grouped by chatId

**moderation_logs**
- Audit trail of violations
- Records violation type and content snippet
- Used for admin review and pattern detection

### Performance Optimization

**Indexes**:
```sql
-- Query optimization
CREATE INDEX doubt_classroomId_idx ON doubts(classroomId);
CREATE INDEX type_idx ON doubts(type);
CREATE INDEX subject_idx ON doubts(subject);
CREATE INDEX doubtId_idx ON replies(doubtId);
CREATE INDEX userEmail_idx ON memberships(userEmail);
```

**Unique Constraints**:
- Only one membership per user per classroom
- Only one bookmark per user per doubt
- Only one like per user per doubt

---

## Authentication & Authorization

### Clerk Integration

**Setup**:
- Configured in `middleware.tsx`
- Protected routes with `createRouteMatcher`
- Public routes: home, sign-in/up, public boards

**Public Routes**:
```
/              (home)
/sign-in       (auth)
/sign-up       (auth)
/public-rooms  (read-only doubt board)
/api/inngest   (webhook)
```

**Protected Routes**:
```
/dashboard     (requires auth)
/profile       (requires auth)
/rooms         (requires auth)
/ask-ai        (requires auth)
```

### Authorization Levels

**Student**:
- Create doubts
- Reply to doubts
- Like/bookmark
- View classroom doubts (if member)
- View own analytics

**Teacher**:
- Create classrooms
- Invite students
- Mark solutions as correct
- View classroom analytics
- Moderate content
- Pin/feature doubts

**Admin**:
- All teacher permissions
- Global moderation
- User management
- System analytics

---

## API Design

### Request/Response Pattern

**Standard Success Response**:
```json
{
  "success": true,
  "data": { /* entity data */ },
  "message": "Operation completed"
}
```

**Error Response**:
```json
{
  "error": "Error code",
  "message": "Human-readable error",
  "details": "Additional context"
}
```

### Common Query Parameters

```
GET /api/doubts?subject=Math&classroomId=5&type=community&tag=algebra
```

- `subject`: Filter by subject (Math, Physics, etc.)
- `classroomId`: Scope to classroom (null for public)
- `type`: Filter by type (ai, community, teacher)
- `tag`: Filter by tag name
- `userName`: Search by student name (optional)

### Pagination

Most list endpoints support cursor-based pagination:
```
GET /api/doubts?limit=10&offset=0
```

---

## Asynchronous Processing

### Inngest Integration

Background jobs for heavy/async work:

**Setup**:
- Inngest client: `inngest/client.ts`
- Function definitions: `inngest/functions.ts`
- API webhook: `app/api/inngest/route.ts`

**Example Job: Notify Teacher of Doubt**:
```typescript
// inngest/functions.ts
export const notifyTeacherOfDoubt = inngest.createFunction(
  { id: "notify-teacher-doubt" },
  { event: "doubt/created" },
  async ({ event }) => {
    const doubt = event.data;
    const classroom = await db.select()
      .from(classroomsTable)
      .where(eq(classroomsTable.id, doubt.classroomId));
    
    await sendEmail({
      to: classroom.teacherEmail,
      subject: `New doubt in ${classroom.name}`,
      html: renderDoubtNotification(doubt),
    });
  }
);
```

**Triggering**:
```typescript
// Inside API route
await inngest.send({
  name: "doubt/created",
  data: { doubtId: 123, classroomId: 5 },
});
```

---

## Safety & Moderation

### Content Moderation Pipeline

**Steps**:
1. **Input Validation**: Zod schema ensures valid format
2. **Profanity Filter**: Check against banned word list
3. **Spam Detection**: Flag excessive punctuation, repeated messages
4. **Length Check**: Doubts must be reasonable length
5. **Topic Detection**: Flag completely off-topic content
6. **Toxicity Scoring**: AI-powered sentiment analysis

### User Blocking

**Trigger**:
- 3+ moderation violations in 30 days
- Manual admin action

**Effect**:
- User cannot create doubts/replies
- User can still view (read-only mode)
- Block expires after 48 hours (auto-reset)

**Storage**:
```sql
UPDATE users 
SET isBlocked = true, blockedUntil = NOW() + INTERVAL '48 hours'
WHERE id = $1;
```

---

## Rate Limiting

### Strategy

**Two-tier rate limiting** in `middleware.tsx`:

1. **General API Limit**: 100 requests per minute per IP
2. **AI Route Limit**: 10 requests per minute per IP (stricter)

**Implementation**:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const generalLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(100, "60 s"),
});

const aiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(10, "60 s"),
});
```

**Response**:
```json
{
  "error": "Too many requests",
  "retryAfter": "45 seconds"
}
```

---

## Adding New Features

### Step-by-Step Guide

#### 1. Create Database Schema (if needed)

**File**: `configs/schema.ts`

```typescript
import { pgTable, varchar, timestamp, foreignKey } from "drizzle-orm/pg-core";

export const myNewTable = pgTable("my_new_table", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userEmail: varchar({ length: 255 }).notNull(),
  data: text(),
  createdAt: timestamp().defaultNow(),
}, (table) => ({
  userEmailFk: foreignKey({
    columns: [table.userEmail],
    foreignColumns: [usersTable.email],
  }).onDelete("cascade"),
}));
```

**Generate Migration**:
```bash
npm run db:migrate
# Follow prompts to name your migration
```

#### 2. Create API Routes

**File**: `app/api/my-feature/route.ts`

```typescript
import { db } from "@/configs/db";
import { myNewTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.primaryEmailAddress?.emailAddress;
    
    const data = await db.select()
      .from(myNewTable)
      .where(eq(myNewTable.userEmail, email));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const email = user.primaryEmailAddress?.emailAddress;

    const [newRecord] = await db.insert(myNewTable)
      .values({
        userEmail: email,
        data: body.data,
      })
      .returning();

    return NextResponse.json({ success: true, data: newRecord });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 400 }
    );
  }
}
```

#### 3. Create React Components/Pages

**File**: `components/MyFeature.tsx`

```typescript
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function MyFeature() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/my-feature");
      const json = await res.json();
      setData(json.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div>
      {loading ? <p>Loading...</p> : (
        <ul>
          {data.map((item) => (
            <li key={item.id}>{item.data}</li>
          ))}
        </ul>
      )}
      <Button onClick={() => {/* create logic */}}>Add New</Button>
    </div>
  );
}
```

**Create Page**: `app/(routes)/my-feature/page.tsx`

```typescript
import { MyFeature } from "@/components/MyFeature";

export default function MyFeaturePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">My Feature</h1>
      <MyFeature />
    </div>
  );
}
```

#### 4. Add Tests

**File**: `__tests__/api/my-feature.test.ts`

```typescript
import { GET, POST } from "@/app/api/my-feature/route";

describe("My Feature API", () => {
  it("should fetch data", async () => {
    const req = new Request("http://localhost/api/my-feature");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("should create new record", async () => {
    const req = new Request("http://localhost/api/my-feature", {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

#### 5. Update Documentation

- Add feature description to README.md
- Document new API endpoints in API_DOCS (if exists)
- Add database diagram updates

#### 6. Deploy

```bash
# Test locally
npm run dev

# Build
npm run build

# Deploy to Vercel
git push origin feature-branch
# Vercel auto-deploys
```

---

## Common Patterns

### Error Handling

```typescript
import { buildErrorResponse } from "@/lib/error-handler";

try {
  // code
} catch (error) {
  return NextResponse.json(
    buildErrorResponse("operation_failed", "Could not perform operation"),
    { status: 500 }
  );
}
```

### Database Queries with Drizzle

```typescript
import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { eq, and, or, desc } from "drizzle-orm";

// Single query
const [doubt] = await db.select()
  .from(doubtsTable)
  .where(eq(doubtsTable.id, doubtId));

// Conditional query
const doubts = await db.select()
  .from(doubtsTable)
  .where(
    and(
      eq(doubtsTable.classroomId, classroomId),
      eq(doubtsTable.isSolved, "unsolved")
    )
  )
  .orderBy(desc(doubtsTable.createdAt))
  .limit(10);

// Join
const doubtsWithReplies = await db.select()
  .from(doubtsTable)
  .leftJoin(repliesTable, eq(doubtsTable.id, repliesTable.doubtId))
  .where(eq(doubtsTable.id, doubtId));
```

### Inngest Background Jobs

```typescript
// Define function
export const myBackgroundJob = inngest.createFunction(
  { id: "my-job" },
  { event: "my/event" },
  async ({ event, step }) => {
    // Step 1: Do something
    await step.run("step-1", async () => {
      // Your logic
    });

    // Step 2: Wait and do more
    await step.sleep("wait", "1 hour");
    await step.run("step-2", async () => {
      // More logic
    });
  }
);

// Trigger from API
await inngest.send({
  name: "my/event",
  data: { userId: 123 },
});
```

---

## Troubleshooting

### Issue: "Access denied to this classroom"

**Cause**: User not a member of the classroom
**Solution**: Check `memberships` table - user's email must be in table with classroom ID

### Issue: Content moderated immediately

**Cause**: Moderation rules flagging legitimate content
**Solution**: Check `lib/moderation.ts` - may need to tune thresholds

### Issue: Rate limit exceeded

**Cause**: Too many requests from same IP
**Solution**: Check `middleware.tsx` - AI routes limited to 10/min, general 100/min

### Issue: Database migration failed

**Cause**: Schema drift detected
**Solution**: Run `npm run db:reset` (dev only) or manually fix schema

---

## Resources

- **Database Schema**: [configs/schema.ts](../configs/schema.ts)
- **API Routes**: [app/api/](../app/api/)
- **Component Examples**: [components/](../components/)
- **Contributing Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Main README**: [README.md](../README.md)

---

## Questions or Found Issues?

Open an issue on GitHub or reach out to the maintainers. This documentation is a living document and will be updated as the architecture evolves.
