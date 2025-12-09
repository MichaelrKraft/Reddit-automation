# Reddit Account Warm-Up Feature - Implementation Plan

## Research Summary

Based on research of competitors (especially Scaloom) and Reddit automation best practices, here's what a warm-up system needs to implement.

## What is Account Warm-Up?

Account warm-up is the gradual process of building credibility and trust with Reddit's anti-spam algorithms to avoid bans and shadowbans. New or purchased accounts that immediately start posting promotional content get flagged as spam.

### Key Metrics for "Warmed Up" Status
- **100+ karma** (combination of post and comment karma)
- **30+ days of consistent activity**
- **Positive engagement history** in relevant subreddits
- **Natural behavior patterns** (no sudden activity spikes)

---

## Warm-Up Timeline (Industry Standard)

### Phase 1: Days 1-3 (Browse & Join)
- Browse Reddit 5-10 minutes daily
- Join 5-10 relevant subreddits
- Upvote 10-15 posts/comments
- **NO posting or commenting yet**

### Phase 2: Days 4-7 (Light Engagement)
- Continue browsing 10-15 minutes daily
- Add 2-4 genuine comments per day
- Upvote 15-20 posts/comments
- Join 5-10 more subreddits

### Phase 3: Days 8-14 (First Posts)
- Make first original post in casual/hobby subreddits
- Increase commenting to 4-6 per day
- Continue upvoting (20-30 per day)
- Target karma: 50+

### Phase 4: Days 15-30 (Build Credibility)
- Post 1-2 times per day in relevant subreddits
- Comment 6-10 times per day
- Aim for 100+ total karma
- Establish posting pattern

### Phase 5: Days 30+ (Promotional Content)
- **9:1 ratio**: 9 genuine contributions for every 1 promotional mention
- Slowly increase promotional posts
- Maintain consistent engagement

---

## Ban Prevention Best Practices

### What Reddit Detects:
1. **Sudden activity spikes** after long inactivity
2. **Brand-style usernames** (e.g., "BestProduct2025")
3. **Empty profiles** with no history
4. **Identical content** across multiple subreddits
5. **Too many links** to same domain
6. **Rapid posting** without community interaction

### How to Avoid Bans:
1. **Gradual activity increase** (never spike suddenly)
2. **Real usernames** (casual, not branded)
3. **Complete profile** (avatar, bio, join communities)
4. **Unique content** per subreddit
5. **Vary domains** in link posts
6. **Space out posts** (10+ minutes between)
7. **Engage before promoting** (comment/upvote first)

---

## Technical Implementation Plan

### Database Schema Additions

```prisma
model RedditAccount {
  // Existing fields...
  
  // Warm-up specific fields
  warmupStatus      String    @default("not_started") // not_started, in_progress, completed
  warmupStartedAt   DateTime?
  warmupCompletedAt DateTime?
  warmupPhase       Int       @default(0) // 0-5
  currentKarma      Int       @default(0)
  postKarma         Int       @default(0)
  commentKarma      Int       @default(0)
  accountAgeInDays  Int       @default(0)
  
  warmupActivities  WarmupActivity[]
  warmupSchedule    WarmupSchedule?
}

model WarmupSchedule {
  id              String   @id @default(cuid())
  accountId       String   @unique
  account         RedditAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  // Daily targets per phase
  dailyUpvotes    Int      @default(0)
  dailyComments   Int      @default(0)
  dailyPosts      Int      @default(0)
  
  // Activity tracking
  lastActivityAt  DateTime @default(now())
  activeDaysCount Int      @default(0)
  
  // Settings
  activityTimeMin Int      @default(5)  // minutes per day
  activityTimeMax Int      @default(15)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model WarmupActivity {
  id          String   @id @default(cuid())
  accountId   String
  account     RedditAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  activityType String  // upvote, comment, post, join_subreddit
  subreddit    String?
  postId       String? // Reddit post ID
  commentId    String? // Reddit comment ID
  content      String? @db.Text
  
  scheduledFor DateTime
  completedAt  DateTime?
  status       String   @default("pending") // pending, completed, failed, skipped
  
  createdAt    DateTime @default(now())
  
  @@index([accountId, scheduledFor])
  @@index([status, scheduledFor])
}
```

### API Endpoints Needed

```typescript
// GET /api/warmup/status?accountId=xxx
// Returns current warm-up status and progress

// POST /api/warmup/start
// Start warm-up process for an account
{
  "accountId": "string",
  "targetSubreddits": ["subreddit1", "subreddit2"], // optional
  "aggressiveness": "normal" | "conservative" | "fast" // optional
}

// POST /api/warmup/pause
// Pause warm-up temporarily

// POST /api/warmup/resume
// Resume warm-up

// POST /api/warmup/complete
// Mark as completed (or auto-complete at 30 days)

// GET /api/warmup/schedule?accountId=xxx
// Get upcoming scheduled activities

// POST /api/warmup/activity/manual
// Manually log activity (if user did something outside automation)
```

### Queue Jobs (BullMQ)

```typescript
// warmup-upvote-job
// - Find random posts in subscribed subreddits
// - Upvote using Reddit API
// - Log activity

// warmup-comment-job
// - Generate AI comment based on post content
// - Post comment using Reddit API
// - Log activity

// warmup-post-job
// - Generate casual post for specified subreddit
// - Submit using Reddit API
// - Log activity

// warmup-scheduler-job (runs every hour)
// - Check accounts in warm-up
// - Schedule activities based on phase
// - Ensure natural timing (randomize within windows)

// warmup-progress-checker-job (runs daily)
// - Update karma counts
// - Check if account reached next phase
// - Auto-complete if 30 days + 100 karma
```

---

## UI Components Needed

### 1. Warm-Up Dashboard
```
Location: /dashboard/warmup

Shows:
- List of all accounts with warm-up status
- Progress bars for each account
- Phase indicators
- Karma counts
- Days active
- Next scheduled activity
- "Start Warm-Up" button for new accounts
```

### 2. Account Warm-Up Detail Page
```
Location: /dashboard/warmup/[accountId]

Shows:
- Current phase and timeline
- Karma progress chart
- Activity calendar (heatmap)
- Upcoming scheduled activities
- Activity log (recent actions)
- Manual controls (pause/resume/skip)
- Warm-up settings (edit targets)
```

### 3. Warm-Up Settings Modal
```
Allows configuration:
- Target subreddits for engagement
- Activity frequency (conservative/normal/fast)
- Daily time windows (when to be active)
- Content tone preferences for AI
- Auto-complete settings
```

---

## AI Integration

### Content Generation for Warm-Up

```typescript
// Generate natural comments (not promotional)
async function generateWarmupComment(
  post: { title: string; content: string; subreddit: string }
) {
  const prompt = `
Generate a genuine, helpful Reddit comment for warm-up purposes.

Post in r/${post.subreddit}:
Title: ${post.title}
Content: ${post.content.slice(0, 300)}

Requirements:
- Be authentic and conversational
- Add value to the discussion
- NO promotional content
- 1-3 sentences
- Match the subreddit's tone
- Be genuinely helpful or interesting

Return ONLY the comment text.
`
  
  // Use Gemini to generate
}

// Generate casual posts for warm-up
async function generateWarmupPost(subreddit: string, topic?: string) {
  // Generate casual, non-promotional content
  // Topics: hobbies, questions, observations, stories
}
```

---

## Reddit API Rate Limiting

### Current Limits
- **60 requests per minute** per OAuth client
- Averaged over 10-minute window
- Response headers: `X-Ratelimit-Used`, `X-Ratelimit-Remaining`, `X-Ratelimit-Reset`

### Implementation Strategy
```typescript
class RedditRateLimiter {
  private requestQueue: Array<() => Promise<any>> = []
  private requestsThisMinute = 0
  private windowStart = Date.now()
  
  async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if at limit
    while (this.requestsThisMinute >= 55) { // Buffer of 5
      await this.waitForWindow()
    }
    
    // Reset window if needed
    if (Date.now() - this.windowStart >= 60000) {
      this.requestsThisMinute = 0
      this.windowStart = Date.now()
    }
    
    this.requestsThisMinute++
    return await fn()
  }
  
  private async waitForWindow() {
    const elapsed = Date.now() - this.windowStart
    const waitTime = 60000 - elapsed
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}
```

---

## Warm-Up Strategies

### Conservative (Recommended for New Accounts)
- 30-45 day warm-up period
- Slower activity increase
- More genuine engagement
- Lower ban risk

### Normal (Balanced)
- 20-30 day warm-up period
- Standard activity levels
- Mix of engagement types
- Medium ban risk

### Fast (Riskier, for Established Accounts)
- 10-15 day warm-up period
- Faster activity ramp
- More aggressive posting
- Higher ban risk

---

## Monitoring & Alerts

### Health Checks
- Daily karma change tracking
- Shadowban detection (posts not appearing)
- Engagement rate monitoring (replies to comments)
- Subreddit participation spread

### Alert Triggers
- Karma suddenly drops (possible downvote brigade)
- Posts not getting any votes (possible shadowban)
- Account age milestone reached
- Warm-up phase completed
- Manual review needed (unusual patterns)

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Add database schema changes
- [ ] Create warmup-scheduler service
- [ ] Implement rate limiter
- [ ] Set up BullMQ jobs

### Phase 2: Activity Automation (Week 2)
- [ ] Upvote automation
- [ ] Comment generation & posting
- [ ] Post generation & submission
- [ ] Activity logging

### Phase 3: UI & Dashboard (Week 3)
- [ ] Warm-up dashboard page
- [ ] Account detail page
- [ ] Progress tracking components
- [ ] Settings configuration

### Phase 4: Intelligence & Monitoring (Week 4)
- [ ] Karma tracking
- [ ] Shadowban detection
- [ ] Health monitoring
- [ ] Alert system

### Phase 5: Testing & Refinement (Week 5)
- [ ] Test with real accounts
- [ ] Gather metrics
- [ ] Adjust algorithms
- [ ] Polish UI

---

## Competitive Analysis: Scaloom's Approach

Based on research, Scaloom implements:
- **AI-customized warm-up strategy** per account
- **Real-time tracking** of karma and engagement
- **Automatic adjustment** based on account performance
- **Subreddit-specific** engagement patterns
- **Built-in monitoring** for shadowbans and health

Our implementation should match or exceed these features.

---

## Risk Mitigation

### Legal/ToS Compliance
- Reddit's API Terms explicitly allow automation for legitimate use
- Must use proper OAuth authentication
- Must not automate upvoting/downvoting in manipulative ways
- Warm-up should focus on **genuine engagement**, not fake activity

### Technical Risks
- Rate limiting (handled by implementation above)
- Shadowbans (detected through monitoring)
- Account bans (mitigated by gradual, natural activity)
- API changes (monitor Reddit's developer updates)

---

## Success Metrics

### Account-Level
- 100+ karma achieved
- 30+ days active
- No shadowbans detected
- Able to post in target subreddits without removals

### System-Level
- 90%+ warm-up completion rate
- <5% ban rate during warm-up
- Average 25-30 days to completion
- User satisfaction with automation quality

---

## Estimated Development Time

- **Database & API**: 2-3 days
- **Queue Jobs & Automation**: 3-4 days
- **UI Components**: 3-4 days
- **AI Integration**: 2 days
- **Testing & Refinement**: 3-4 days

**Total: 2-3 weeks for full implementation**

---

## Sources

Research based on:
- [Scaloom's Reddit Account Warmup](https://scaloom.com/warmup-reddit-account)
- [How to Warm Up a Reddit Account Safely (2025)](https://dicloak.com/blog-detail/how-to-warm-up-a-reddit-account-safely-complete-guide-for-2025)
- [How to Warm Up a Reddit Account (Multilogin)](https://multilogin.com/blog/how-to-warm-up-a-reddit-account/)
- [How to Prevent Bans When Running Multiple Reddit Accounts](https://multilogin.com/academy/how-to-prevent-bans-when-running-multiple-reddit-accounts/)
- [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki)
- [Reddit API Rate Limiting Explained](https://laterforreddit.com/news/2017/03/04/reddit-api-ratelimiting-explained/)
