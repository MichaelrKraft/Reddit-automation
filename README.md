# Reddit Automation Platform

AI-powered Reddit marketing automation platform inspired by Scaloom.

## 🎯 Features

### Phase 1: Foundation & Setup ✅ COMPLETE
- ✅ Next.js 14 with TypeScript
- ✅ PostgreSQL database (Render)
- ✅ Redis for job queuing (Render)
- ✅ Prisma ORM with full schema
- ✅ Reddit API integration setup
- ✅ Gemini AI integration ready

### Planned Features (Phases 2-5)

#### 📅 Post Scheduling
- Schedule posts to multiple subreddits
- Queue management with BullMQ
- Best time recommendations

#### 🤖 AI Content Generation
- Gemini AI-powered content creation
- Subreddit-specific content tailoring
- Title and body optimization

#### 🔍 Subreddit Discovery
- Find relevant communities automatically
- Filter by subscribers, activity
- Relevance scoring

#### 💬 Auto-Replies
- Monitor comments 24/7
- AI-generated contextual responses
- Smart engagement tracking

#### 📊 Analytics Dashboard
- Post performance tracking
- Engagement metrics
- CSV report exports

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (via Render)
- Redis (via Render)
- Reddit API credentials
- Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Visit http://localhost:3000

## 📁 Project Structure

```
reddit-automation/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
│   └── prisma.ts         # Prisma client
├── prisma/               # Database schema
│   └── schema.prisma     # Prisma schema
├── public/               # Static files
└── .env.local           # Environment variables (not in git)
```

## 🗄️ Database Schema

### Tables
- **RedditAccount** - Reddit account management
- **Campaign** - Marketing campaigns
- **Subreddit** - Discovered subreddits
- **Post** - Scheduled and posted content
- **PostAnalytics** - Performance metrics
- **Comment** - Comment tracking for auto-replies

## 🔑 Environment Variables

Create `.env.local` with:

```env
# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# AI
GEMINI_API_KEY=your_gemini_key

# App
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Render)
- **ORM**: Prisma
- **Queue**: BullMQ + Redis
- **AI**: Google Gemini AI
- **Reddit API**: Snoowrap
- **Styling**: Tailwind CSS
- **Deployment**: Render

## 📜 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:migrate # Run Prisma migrations
npm run db:studio  # Open Prisma Studio
npm run db:push    # Push schema to database
```

## 🚀 Deployment to Render

### 1. Web Service
- Connect your GitHub repository
- Build Command: `npm install && npm run build && npx prisma migrate deploy`
- Start Command: `npm start`
- Environment: Add all variables from `.env.local`

### 2. Auto-Deploy
Render will automatically deploy when you push to `main` branch.

## 🗺️ Development Roadmap

### Week 1-2: Core Features
- [ ] Phase 2: Post Scheduling Engine
- [ ] Phase 3: AI Content Generation
- [ ] Phase 4: Subreddit Discovery

### Week 3-4: Advanced Features  
- [ ] Phase 5: Auto-Reply System
- [ ] Phase 6: Analytics Dashboard
- [ ] Phase 7: UI Polish & Testing

## ⚠️ Important Notes

### Reddit API Limits
- Be mindful of Reddit's rate limits
- Implement exponential backoff
- Follow Reddit's API terms of service

### Database
- External URL for local development
- Internal URL for Render services
- Regular backups recommended

### Security
- Never commit `.env.local` to git
- Rotate API keys regularly
- Use strong passwords for Reddit accounts

## 📝 Next Steps

1. **Update `.env.local`** with your Reddit username/password
2. **Test Reddit API connection** - Create test post API route
3. **Build Phase 2** - Post scheduling system
4. **Create UI components** - Dashboard, forms, lists

## 🤝 Contributing

This is a personal project, but feel free to fork and adapt for your needs!

## 📄 License

MIT

---

**Built with ❤️ using Next.js, Gemini AI, and PostgreSQL**
