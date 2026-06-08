# Local Environment Setup Guide

Welcome to the DoubtDesk local environment setup guide! DoubtDesk connects to several external services to power authentication, data storage, and AI inference. 

To run the project locally, you must configure your `.env` file correctly. This guide will walk you through the setup order, what is strictly required, and how to verify your setup before starting the development server.

> **Docker:** You can also run the app in a container. See the [Docker section in README.md](../README.md#docker) for `docker compose` commands. The same `.env` variables and external services apply.
---

## 1. Setup Order (Which services to configure first)

To avoid cascading errors, we highly recommend setting up your services in this specific order:

1. **Authentication (Clerk):** The app middleware protects almost every route. If Clerk is not configured first, the application will immediately redirect you or crash on load.
2. **Database (Neon PostgreSQL):** Once authenticated, the app will try to fetch your profile data from the database.
3. **AI Engine (Groq):** Once the basic UI and data fetching work, you can configure Groq to enable the core AI solver features.
4. **Optional Services:** Only set up Inngest (Background Jobs), Upstash (Rate Limiting), Resend (Emails), or Supabase (Storage) if you are actively working on those specific features.

---

## 2. Required Variables

You must populate these variables in your `.env` file, or the application will fail to start.

### Authentication (Clerk)
Create a free application at [Clerk](https://clerk.com/) to get your API keys.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your publishable key (starts with `pk_test_`).
- `CLERK_SECRET_KEY`: Your secret key (starts with `sk_test_`).
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` & `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Set these to `/sign-in` and `/sign-up`.

### Database (Neon PostgreSQL)
Create a free serverless Postgres instance at [Neon](https://neon.tech/).
- `DATABASE_URL`: Your connection string. **Crucial:** Ensure you append `?sslmode=require` to the end of the URL.

### AI Engine (Groq)
Create a free API key at the [Groq Console](https://console.groq.com/).
- `GROQ_API_KEY`: Your Groq API key (starts with `gsk_`).

### Site Configuration
- `NEXT_PUBLIC_SITE_URL` & `NEXT_PUBLIC_APP_URL`: Leave these as `http://localhost:3000`.
- `UNSUBSCRIBE_SECRET`: Generate a long, random alphanumeric string.

---

## 3. Optional Variables

The local UI will run perfectly fine without these, but certain background/production features will be disabled or fail if triggered.

- **Background Jobs (Inngest):** `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`
  - *What breaks:* Asynchronous tasks and event-driven background jobs will not execute.
- **Rate Limiting (Upstash Redis):** `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
  - *What breaks:* API rate limiting will be bypassed locally. (This is required for production).
- **Email Delivery (Resend):** `RESEND_API_KEY`
  - *What breaks:* Transactional emails (like moderation warnings) will fail to send.
- **File Storage (Supabase):** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - *What breaks:* Image uploads for doubts will fail.

---

## 4. Setup Verification Checklist

Before running `npm run dev`, verify your environment:

- [ ] I have copied `.env.example` to `.env`.
- [ ] My `DATABASE_URL` ends with `?sslmode=require`.
- [ ] Both Clerk keys (`PUBLISHABLE_KEY` and `SECRET_KEY`) are populated.
- [ ] `GROQ_API_KEY` is populated.

Once verified, start the server:
```bash
npm run dev
```

---

## 5. Common Troubleshooting Notes

If you encounter issues starting the application, check these common failures:

**Error:** `Invalid URL` or `PrismaClientInitializationError`
- **Fix:** Your `DATABASE_URL` is malformed. Ensure there are no spaces, and you included `?sslmode=require`.

**Error:** `Clerk: Missing secret key` or Infinite Redirect Loops
- **Fix:** You are missing the `CLERK_SECRET_KEY` or you accidentally put your publishable key in the secret key field.

**Error:** `Groq API Error: 401 Unauthorized`
- **Fix:** Your Groq API key is invalid or has been revoked. Ensure there are no trailing spaces in your `.env` file.

**Error:** `Event payload missing` (Inngest)
- **Fix:** You triggered a background job but haven't configured the Inngest optional variables.
