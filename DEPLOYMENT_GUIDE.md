# Reddit Automation Platform - Deployment Guide

## ✅ Local Git Repository Status

**COMPLETED**:
- ✅ Git repository initialized
- ✅ All files committed (52 files, 15,649 lines)
- ✅ Branch renamed to `main`
- ✅ .gitignore configured (excludes .env.local, node_modules, .next)

**Commit**: `cb47852` - "Initial commit: Complete Reddit automation platform with 5 features"

---

## 🚀 Step 1: Create GitHub Repository

Since the repository doesn't exist on GitHub yet, you need to create it:

### Option A: Via GitHub Website (Recommended)
1. Go to https://github.com/new
2. **Repository name**: `reddit-automation`
3. **Description**: "Personal Reddit automation platform with scheduling, AI content generation, and analytics"
4. **Visibility**: Private (recommended for personal use with credentials)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Option B: Via Command Line (if you have GitHub CLI installed)
```bash
gh repo create michaelkraft/reddit-automation --private --source=. --remote=origin
```

---

## 🚀 Step 2: Push to GitHub

After creating the repository on GitHub, run these commands:

```bash
cd /Users/michaelkraft/reddit-automation

# If you used Option A (website), set up the remote:
git remote add origin git@github.com:michaelkraft/reddit-automation.git

# Push to GitHub
git push -u origin main
```

**Expected Output**:
```
Enumerating objects: 57, done.
Counting objects: 100% (57/57), done.
Delta compression using up to 8 threads
Compressing objects: 100% (54/54), done.
Writing objects: 100% (57/57), 234.56 KiB | 11.73 MiB/s, done.
Total 57 (delta 5), reused 0 (delta 0), pack-reused 0
To github.com:michaelkraft/reddit-automation.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## 🚀 Step 3: Deploy to Render

### Prerequisites
You already have:
- ✅ PostgreSQL database on Render
- ✅ Redis instance on Render (internal URL for production)

### 3.1: Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select the `reddit-automation` repository
5. Configure the service:

**Basic Settings**:
- **Name**: `reddit-automation`
- **Region**: Oregon (US West) - same as your database
- **Branch**: `main`
- **Root Directory**: (leave blank)
- **Environment**: `Node`
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Free

### 3.2: Environment Variables

Add these environment variables in Render (Settings → Environment):

```env
# Reddit API Credentials
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# Database (use INTERNAL URL from your existing Render PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (use INTERNAL URL from your existing Render Redis)
REDIS_URL=redis://your-redis-host:6379

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# App Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://reddit-automation.onrender.com
```

> **Your actual credentials are saved locally in `CREDENTIALS.md`** (git-ignored, never pushed to GitHub).

**Important Notes**:
- Use **INTERNAL URLs** for PostgreSQL and Redis (without `.render.com` suffix)
- Internal URLs only work within Render's network
- Replace `NEXT_PUBLIC_APP_URL` with your actual Render URL after deployment

### 3.3: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your GitHub repository
   - Install dependencies
   - Generate Prisma client
   - Run database migrations
   - Build Next.js application
   - Start the server

**Deployment Time**: ~5-7 minutes for first deployment

---

## 📊 Step 4: Verify Deployment

Once deployed, test these URLs (replace with your actual Render URL):

1. **Homepage**: `https://reddit-automation.onrender.com`
2. **Dashboard**: `https://reddit-automation.onrender.com/dashboard`
3. **API Health**: `https://reddit-automation.onrender.com/api/account`

### Expected Behavior:
- ✅ Homepage shows 6 feature cards
- ✅ Dashboard loads with "Create New Post" button
- ✅ Background workers start automatically (check Render logs)
- ✅ Can create and schedule posts
- ✅ Subreddit discovery works
- ✅ Analytics dashboard displays data

---

## 🔧 Step 5: Configure Reddit App for Production

Update your Reddit app to work with production URL:

1. Go to https://www.reddit.com/prefs/apps
2. Find your app (`RedditAutomation`)
3. Update **redirect uri**: `https://reddit-automation.onrender.com/auth/callback`
4. Click "update app"

---

## 📝 Step 6: Post-Deployment Setup

### Monitor Background Workers

Check Render logs for worker initialization:
```
🚀 Starting Reddit post worker...
💬 Starting Reddit reply worker...
```

### Test Core Features

1. **Create a Post**:
   - Navigate to Dashboard → "Create New Post"
   - Fill in subreddit, title, content
   - Schedule for immediate posting
   - Verify in Render logs that job was processed

2. **Subreddit Discovery**:
   - Navigate to "Discover Subreddits"
   - Search for "technology"
   - Verify 25 results appear

3. **Analytics**:
   - Navigate to "Analytics"
   - Click "Refresh from Reddit"
   - Verify data appears

---

## 🚨 Troubleshooting

### Build Fails on Render
- Check that all environment variables are set
- Verify DATABASE_URL uses internal Render URL
- Check Render logs for specific error messages

### Database Connection Errors
- **Solution**: Use **internal** Render PostgreSQL URL (ends with `-a:5432`, not `.render.com:5432`)
- Example: `dpg-d418m418ocjs73cj0uv0-a:5432`

### Redis Connection Errors
- **Solution**: Use **internal** Render Redis URL
- Example: `redis://red-d418oemuk2gs738ukivg:6379`

### Reddit API 401 Errors
- Verify credentials are correct in Render environment variables
- Check that redirect URI is updated for production URL

### Workers Not Starting
- Check Render logs for error messages
- Verify Redis connection is working
- Ensure `npm start` command is correct

---

## 📚 Additional Resources

- **Session Summary**: See `SESSION_SUMMARY_COMPLETE.md` for complete development history
- **README**: See `README.md` for feature documentation
- **API Fixed Documentation**: See `REDDIT_API_FIXED.md` for credential troubleshooting

---

## ✅ Deployment Checklist

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Render web service created
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] Application builds successfully
- [ ] Workers start without errors
- [ ] Homepage loads correctly
- [ ] Dashboard accessible
- [ ] Reddit API authentication working
- [ ] Can create and schedule posts
- [ ] Subreddit discovery functional
- [ ] Analytics dashboard working

---

**Deployment Date**: October 30, 2025  
**Status**: Ready for deployment (local git commit complete)  
**Next Step**: Create GitHub repository and push code
