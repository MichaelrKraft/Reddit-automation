# Opportunity Miner Removal Plan

**Session**: Opportunity Miner Removal
**Date**: December 11, 2025
**Goal**: Remove the Opportunity Miner feature from ReddRide to make it a standalone app

---

## Summary

The Opportunity Miner feature is deeply integrated into ReddRide across:
- Landing page marketing sections
- Dashboard navigation and links
- 2 dedicated pages (list + detail views)
- 7 UI components
- 6 API route directories
- 3 library files for scanning/analyzing/scoring
- Queue and worker integrations
- Database models (Prisma)

---

## Removal Plan

### Phase 1: Landing Page Marketing Removal

- [ ] **1.1** Remove Opportunity Miner feature showcase section (lines 613-662 in `app/page.tsx`)
  - This is the amber/yellow gradient section with "Stop Guessing What People Want" heading

- [ ] **1.2** Remove Opportunity Miner FAQ entry (line 989-991 in `app/page.tsx`)
  - Question: "What is Opportunity Miner and how does it work?"

### Phase 2: Dashboard Navigation Removal

- [ ] **2.1** Remove Opportunity Miner link from `components/DashboardNav.tsx` (line 7)
  - `{ href: '/dashboard/opportunity-miner', label: '💎 Opportunity Miner' }`

- [ ] **2.2** Remove Opportunity Miner button from main dashboard `app/dashboard/page.tsx` (lines 122-127)
  - The red-styled button linking to `/dashboard/opportunity-miner`

### Phase 3: Delete Pages

- [ ] **3.1** Delete `app/dashboard/opportunity-miner/page.tsx`
- [ ] **3.2** Delete `app/dashboard/opportunity-miner/[id]/page.tsx`
- [ ] **3.3** Remove empty `app/dashboard/opportunity-miner/` directory

### Phase 4: Delete Components

Delete entire `components/opportunity-miner/` directory containing:
- [ ] **4.1** `ActionButtons.tsx`
- [ ] **4.2** `CategoryBadge.tsx`
- [ ] **4.3** `FilterBar.tsx`
- [ ] **4.4** `OpportunityCard.tsx`
- [ ] **4.5** `ScoreGauge.tsx`
- [ ] **4.6** `StatsCard.tsx`
- [ ] **4.7** `TrendIndicator.tsx`

### Phase 5: Delete API Routes

Delete entire `app/api/opportunities/` directory containing:
- [ ] **5.1** `route.ts` (main opportunities CRUD)
- [ ] **5.2** `[id]/` directory (individual opportunity endpoints)
- [ ] **5.3** `export/` directory (export functionality)
- [ ] **5.4** `scan/` directory (subreddit scanning)
- [ ] **5.5** `stats/` directory (statistics endpoint)
- [ ] **5.6** `subreddits/` directory (subreddit configuration)

### Phase 6: Delete Library Files

- [ ] **6.1** Delete `lib/opportunity-scanner.ts`
- [ ] **6.2** Delete `lib/opportunity-analyzer.ts`
- [ ] **6.3** Delete `lib/opportunity-scorer.ts`

### Phase 7: Clean Up Queue/Worker (Modify)

- [ ] **7.1** Review and clean `lib/queue.ts` - remove opportunity-related queue definitions
- [ ] **7.2** Review and clean `lib/worker.ts` - remove opportunity-related worker handlers

### Phase 8: Database Schema (DEFER)

**NOT doing in this session** - The Prisma schema contains these models:
- `Opportunity`
- `OpportunityEvidence`
- `OpportunitySubreddit`
- `OpportunityAction`
- `OpportunityCategory` (enum)
- `OpportunityStatus` (enum)
- `TrendDirection` (enum)
- `OpportunityActionType` (enum)
- `MonitoredSubreddit.opportunityMiningEnabled` field
- `MonitoredSubreddit.opportunityFrequency` field
- `MonitoredSubreddit.lastOpportunityScan` field
- `User.opportunities` relation
- `User.opportunityActions` relation

**Reason to defer**:
- Removing models requires a database migration
- Existing data would need to be handled
- These unused models won't affect app functionality
- Can be cleaned up in a future "Phase 2" cleanup

---

## Files to Modify (Summary)

| File | Change |
|------|--------|
| `app/page.tsx` | Remove feature section + FAQ |
| `app/dashboard/page.tsx` | Remove navigation link |
| `components/DashboardNav.tsx` | Remove nav item |
| `lib/queue.ts` | Remove opportunity queue definitions |
| `lib/worker.ts` | Remove opportunity worker handlers |

## Files/Directories to Delete (Summary)

| Path | Type |
|------|------|
| `app/dashboard/opportunity-miner/` | Directory (2 pages) |
| `app/api/opportunities/` | Directory (6 subdirs/files) |
| `components/opportunity-miner/` | Directory (7 components) |
| `lib/opportunity-scanner.ts` | File |
| `lib/opportunity-analyzer.ts` | File |
| `lib/opportunity-scorer.ts` | File |

---

## Verification Checklist

After removal:
- [ ] App builds without errors (`npm run build`)
- [ ] No broken imports or references
- [ ] Landing page loads correctly
- [ ] Dashboard loads correctly
- [ ] No "Opportunity Miner" text visible anywhere in UI
- [ ] No 404 errors when navigating

---

## Review Section

**Completed**: December 12, 2025

### Summary of Changes

All Opportunity Miner code has been successfully removed from ReddRide.

### Files Modified
- `app/page.tsx` - Removed feature showcase section and FAQ entry
- `app/dashboard/page.tsx` - Removed Opportunity Miner navigation button
- `components/DashboardNav.tsx` - Removed nav item
- `lib/queue.ts` - Removed ~150 lines of opportunity queue code
- `lib/worker.ts` - Removed opportunity worker initialization

### Files/Directories Deleted
- `app/dashboard/opportunity-miner/` (entire directory)
- `app/api/opportunities/` (entire directory)
- `app/api/test-scorer/` (discovered during build - was importing opportunity-scorer)
- `components/opportunity-miner/` (7 components)
- `lib/opportunity-scanner.ts`
- `lib/opportunity-analyzer.ts`
- `lib/opportunity-scorer.ts`

### Verification
- [x] Build succeeded (`npm run build`)
- [x] No broken imports
- [x] TypeScript compilation passed

### Deferred Items
- Database schema (Prisma models) - kept in place to avoid migration complexity
- Can be cleaned up in future "Phase 2" if desired

