# Full Analytics Admin Dashboard - Implementation Plan

## Overview
Build a comprehensive admin dashboard with full event tracking to understand user behavior, identify drop-off points, and optimize feature discovery.

---

## Phase 1: Database Schema & Event Tracking Infrastructure

### 1.1 Add Database Models
- [x] Add `UserEvent` model to track all user actions
- [x] Add `PageView` model to track page visits
- [x] Add `isAdmin` field to User model
- [x] Run Prisma migration

### 1.2 Create Event Tracking API
- [x] Create `/api/admin/events` endpoint to receive events
- [x] Create `/api/admin/pageview` endpoint for page views
- [x] Add rate limiting to prevent abuse

### 1.3 Create Client-Side Tracking Library
- [x] Create `lib/analytics.ts` with tracking functions
- [x] Create `useAnalytics` hook for React components
- [x] Create `AnalyticsProvider` context wrapper

---

## Phase 2: Admin Access Control

### 2.1 Admin Authentication
- [x] Create `lib/admin.ts` with admin check functions
- [x] Add admin Clerk user IDs to environment variables
- [x] Create middleware for admin-only routes

### 2.2 Admin API Routes
- [x] Create `/api/admin/users` - list all users with stats
- [x] Create `/api/admin/events/summary` - event analytics
- [x] Create `/api/admin/events/user/[id]` - single user events
- [x] Create `/api/admin/stats` - overall platform stats
- [x] Create `/api/admin/features` - feature usage breakdown

---

## Phase 3: Admin Dashboard UI

### 3.1 Admin Layout & Navigation
- [x] Create `/app/admin/layout.tsx` with admin sidebar
- [x] Add admin check on layout (redirect non-admins)

### 3.2 Dashboard Overview Page (`/app/admin/page.tsx`)
- [x] Total users, new users (24h, 7d, 30d)
- [x] Active users (DAU, WAU, MAU)
- [x] Feature usage rates
- [x] Conversion funnel
- [x] Recent signups

### 3.3 Users List Page (`/app/admin/users/page.tsx`)
- [x] Searchable/filterable user table
- [x] Columns: email, tier, signup date, last active, posts created, accounts connected
- [x] Click to view user detail

### 3.4 User Detail Page (`/app/admin/users/[id]/page.tsx`)
- [x] User profile info
- [x] Activity timeline (events)
- [x] Feature usage breakdown
- [x] Reddit accounts, posts, warmup status

### 3.5 Analytics Pages
- [x] `/app/admin/analytics/page.tsx` - overall analytics with feature usage and funnel

---

## Phase 4: Instrument Existing Features

### 4.1 Key User Actions to Track
- [x] Dashboard page view (via AnalyticsProvider)
- [x] New Post creation flow (each step)
- [x] Reddit account connection
- [x] AI content generation (trackPostAIGenerate)
- [x] Post scheduling (trackPostScheduled)

### 4.2 Feature Discovery Tracking
- [x] First visit to each feature page (via AnalyticsProvider)
- [x] Sidebar navigation clicks

### 4.3 Drop-off Point Tracking
- [x] Form abandonment (trackPostCreateAbandoned)
- [x] Multi-step flow abandonment
- [x] Error occurrences (via AnalyticsProvider)
- [x] Rage clicks (via AnalyticsProvider)

---

## Phase 5: Advanced Analytics (Future)

### 5.1 Computed Metrics
- [ ] Time to first post
- [ ] Time to first Reddit account connected
- [ ] Feature adoption rate
- [ ] User engagement score

### 5.2 Cohort Analysis
- [ ] Group users by signup week
- [ ] Track feature adoption by cohort
- [ ] Retention curves

---

## Files Created

```
lib/analytics.ts - Core tracking functions (trackEvent, trackPageView, trackFeatureDiscovery, etc.)
lib/admin.ts - Admin authentication helpers (isAdmin, requireAdmin)
hooks/useAnalytics.ts - React hook for component-level tracking
components/AnalyticsProvider.tsx - Global tracking context (page views, errors, rage clicks, feature discovery)
app/api/admin/events/route.ts - POST endpoint to receive events
app/api/admin/pageview/route.ts - POST endpoint for page views
app/api/admin/users/route.ts - GET all users with stats
app/api/admin/users/[id]/route.ts - GET single user details and events
app/api/admin/stats/route.ts - GET platform overview stats
app/api/admin/features/route.ts - GET feature usage breakdown
app/admin/layout.tsx - Admin layout with sidebar
app/admin/page.tsx - Admin dashboard overview
app/admin/users/page.tsx - User management page
app/admin/users/[id]/page.tsx - User detail page
app/admin/analytics/page.tsx - Feature usage analytics
```

## Files Modified

```
prisma/schema.prisma - Added UserEvent, PageView models, isAdmin field on User
middleware.ts - Added admin route protection
app/layout.tsx - Wrapped app with AnalyticsProvider
components/WarmupDashboard.tsx - Added Reddit connection tracking
app/dashboard/new-post/page.tsx - Added post creation flow tracking
.env.local - Added ADMIN_CLERK_IDS
```

---

## Environment Variables

```env
ADMIN_CLERK_IDS=user_370UV0Bh0jm30d9CTuZbrAjNc1N
```

---

## Review Section

### Implementation Summary (Completed)

**What was built:**
1. **Complete event tracking infrastructure** - UserEvent and PageView models in Prisma with proper indexes
2. **Admin authentication system** - Clerk-based admin verification with middleware protection
3. **Client-side analytics library** - `lib/analytics.ts` with 15+ tracking functions
4. **AnalyticsProvider** - Auto-tracks page views, feature discovery, errors, and rage clicks
5. **Admin dashboard UI** - 4 pages (overview, users, user detail, analytics)
6. **Priority feature instrumentation** - Reddit connection and post creation flow tracking

**Key tracking implemented:**
- Reddit account connection (started, success, failed, abandoned)
- Post creation flow (started, step 1-3, AI generate, viral check, scheduled, abandoned)
- Feature discovery (first visit to each dashboard feature)
- Page views with session tracking
- Error tracking (JavaScript errors)
- Rage click detection (3+ clicks on same element in 2 seconds)

**Admin dashboard capabilities:**
- Real-time user counts (total, 24h, 7d, 30d)
- Active user metrics (DAU, WAU, MAU)
- Feature usage percentages
- Conversion funnel visualization
- User activity timelines
- Search and filter users

### How to Access

1. **Restart dev server** to pick up ADMIN_CLERK_IDS environment variable
2. **Navigate to** http://localhost:3000/admin
3. **Only admin users** (poolkraftllc@gmail.com) can access

### What You'll See

| Insight | Example |
|---------|---------|
| Feature usage rates | "Only 12% of users use SEO Traffic Finder" |
| Drop-off points | "68% abandon post creation at step 3" |
| Reddit connection flow | "Users who connect Reddit in 5 min have 3x retention" |
| Feature discovery | "Users who find Spy Mode spend 4x longer" |
| Session patterns | "Power users log in Mon/Wed mornings" |
| Rage clicks | "Generate button clicked 5+ times = broken" |

### Next Steps (Optional Future Work)

1. Add more feature-specific tracking (Spy Mode, Speed Alerts, SEO Finder)
2. Implement cohort analysis
3. Add computed metrics (time to first post, engagement scores)
4. Create retention curve visualizations
5. Add export functionality for analytics data

---

## Keyword Alerts Improvements (2025-01-12)

### Task
Fix duplicate alerts and add AI reply buttons to Keyword Alerts

### Completed Changes

**1. Fixed Duplicate Alerts**
- Added `useMemo` hook to deduplicate matches by `postUrl`
- Same Reddit post now shows only once, with all matching keywords displayed as badges
- Uses latest `matchedAt` timestamp when merging duplicates

**2. Added AI Reply Buttons**
- Parses `aiSuggestions` JSON field (already populated by keyword-monitor.ts)
- Shows 3 buttons: **Helpful** (cyan), **Curious** (orange), **Supportive** (green)
- Clicking a button copies the AI reply to clipboard and opens the Reddit post
- Falls back to "Open Thread →" link if no AI suggestions available

### File Modified
- `app/dashboard/speed-alerts/page.tsx` - KeywordAlertsPanel component (lines 1254-1486)

---

## AI Content Generator Enhancement (2025-01-13)

### Task
Add three new features to the AI Content Generator panel in "Create New Post":
1. More tone options (controversial, educational, storytelling)
2. Content length control (short/medium/long)
3. Variable number of variations (3-6)

### Completed Changes

**1. `components/AIContentGenerator.tsx`**
- Extended tone type to include: `controversial`, `educational`, `storytelling` (7 total)
- Added `contentLength` state with options: `short`, `medium`, `long`
- Added `variationCount` state with options: `3`, `4`, `5`, `6`
- Added compact button groups for all new options (matching existing design)
- Updated API call to pass new parameters

**2. `app/api/ai/generate/route.ts`**
- Now accepts `contentLength` and `variationCount` from request body
- Passes new parameters to `generatePostContent()`

**3. `lib/ai.ts`**
- Updated `ContentGenerationOptions` interface with new types
- Added `lengthConfig` with word count ranges:
  - short: 100-300 words
  - medium: 300-600 words
  - long: 600-1200 words
- Prompt now includes explicit word count requirements
- Variation count is now dynamic (3-6)

### UI Layout
```
┌─────────────────────────────────────────────┐
│ What do you want to post about?             │
│ [Input field]                               │
├─────────────────────────────────────────────┤
│ Tone                                        │
│ [Casual] [Professional] [Humorous] [Info]   │
│ [Controversial] [Educational] [Storytelling]│
├─────────────────────────────────────────────┤
│ Content Length                              │
│ [Short] [Medium] [Long]                     │
├─────────────────────────────────────────────┤
│ Number of Variations                        │
│ [3] [4] [5] [6]                             │
├─────────────────────────────────────────────┤
│ Additional Context (Optional)               │
│ [Textarea]                                  │
├─────────────────────────────────────────────┤
│ [Generate Content with AI]                  │
└─────────────────────────────────────────────┘
```

### Verification
- TypeScript compilation passed with no errors
- Existing design system (cyan/dark theme) preserved
- All changes are minimal and targeted
