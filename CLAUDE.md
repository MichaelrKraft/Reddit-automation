# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReddRide is an AI-powered Reddit marketing automation platform. It helps users schedule posts, generate AI content, discover subreddits, auto-reply to comments, track analytics, monitor competitors (Spy Mode), detect viral patterns, and safely warm up new Reddit accounts to avoid shadowbans.

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server on port 3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma generate  # Generate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio GUI
npx prisma migrate dev --name <name>  # Create and run migration
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: BullMQ + Redis for background jobs
- **Auth**: Clerk (handles signup, login, session management)
- **AI**: Google Gemini for content generation
- **Reddit API**: Snoowrap library
- **Payments**: Stripe ($29 lifetime founder deal)
- **Deployment**: Render (auto-deploys from main branch)

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `app/api/` - Backend API endpoints (posts, analytics, viral, spy-mode, warmup, stripe, etc.)
- `app/dashboard/` - Protected dashboard pages
- `components/` - React components (WarmupDashboard, SpyMode, FounderBanner, etc.)
- `lib/` - Core business logic and utilities
- `prisma/schema.prisma` - Database schema with 15+ models

### Core Services (lib/)

| File | Purpose |
|------|---------|
| `auth.ts` | Clerk auth helpers, user tier assignment (FOUNDER/ALPHA/STANDARD) |
| `reddit.ts` | Snoowrap Reddit client wrapper |
| `ai.ts` | Gemini AI integration for content generation |
| `queue.ts` | BullMQ job queue setup for background tasks |
| `stripe.ts` | Stripe client and lifetime deal config ($29) |
| `warmup-orchestrator.ts` | Manages account warmup phases (upvotes → comments → posts) |
| `warmup-worker.ts` | Executes warmup actions via Reddit API |
| `shadowban-detector.ts` | Detects if accounts are shadowbanned |
| `viral-score.ts` | Calculates viral potential scores for posts |
| `timing-analyzer.ts` | Analyzes optimal posting times per subreddit |
| `speed-alerts.ts` | Real-time alerts for trending posts |

### Authentication Flow

Clerk middleware (`middleware.ts`) protects `/dashboard/*` and most `/api/*` routes. Public routes: `/`, `/sign-in`, `/sign-up`, `/api/health`.

The `lib/auth.ts` `getOrCreateUser()` function:
1. Gets Clerk userId from session
2. Creates User record in DB if not exists
3. Assigns tier: first 20 users = FOUNDER, rest = ALPHA
4. Returns user with tier info for feature gating

### User Tier System

```
FOUNDER (users 1-10): Eligible for $29 lifetime deal
ALPHA (users 11+): Free access during alpha
STANDARD: Post-launch pricing ($29/month)
```

### Account Warmup System

New Reddit accounts go through 4 phases to build credibility:
1. **PHASE_1_UPVOTES** (Days 1-3): Upvote content only
2. **PHASE_2_COMMENTS** (Days 4-7): Add helpful comments
3. **PHASE_3_POSTS** (Days 8-14): Start posting
4. **PHASE_4_MIXED** (Days 15-30): Full activity
5. **COMPLETED**: 30+ days, 100+ karma, ready for marketing

### Database Models (Prisma)

Key models: `User`, `RedditAccount`, `Post`, `Campaign`, `Subreddit`, `PostAnalytics`, `Comment`, `SpyAccount`, `SpyPost`, `ViralPattern`, `DraftPost`, `MonitoredSubreddit`, `AlertHistory`, `BrandKeyword`

The `WarmupStatus` enum tracks account warmup progress. `UserTier` enum handles pricing tiers.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Clerk auth
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` / `REDDIT_USERNAME` / `REDDIT_PASSWORD` - Reddit API
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis for BullMQ
- `GEMINI_API_KEY` - Google AI
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Payments

## Deployment

Render auto-deploys from `main` branch. Build command: `npm ci && npx prisma generate && npm run build`

Manual redeploy: Render Dashboard → Manual Deploy → Deploy latest commit
