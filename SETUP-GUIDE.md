# 🚀 ProjectPulse - Complete Setup Guide

This guide will help you set up the entire ProjectPulse application with database, backend, and frontend.

## 📋 What We've Built

### ✅ Complete Backend System
- **Database Schema**: 11 comprehensive models (User, Project, Task, Team, etc.)
- **REST API**: 50+ endpoints for all features
- **Authentication**: GitHub OAuth + Email/Password
- **AI Team Matching**: Pinecone vector embeddings + fallback algorithm
- **GitHub Integration**: Repository sync, issues management
- **Real-time Features**: Notifications, activity tracking

### ✅ Database Models Created
1. **User** - Authentication, profiles, skills, interests
2. **Project** - Projects with GitHub repo integration
3. **ProjectMember** - Team roles and permissions
4. **Task** - Kanban tasks with status tracking
5. **Comment** - Task discussions
6. **Activity** - Project activity feed
7. **TeamInvite** - Team invitation system
8. **Notification** - User notifications
9. **Repository** - Cached GitHub data
10. **MatchScore** - AI teammate matching scores

### ✅ API Endpoints Ready
- `/api/auth/*` - Authentication (GitHub OAuth, login, logout)
- `/api/users/*` - User management and profiles
- `/api/projects/*` - Project CRUD + team management
- `/api/tasks/*` - Task management + Kanban board
- `/api/team/*` - AI team matching + invitations
- `/api/notifications/*` - User notifications
- `/api/activities/*` - Activity tracking
- `/api/github/*` - GitHub integration

## 🛠️ Setup Steps

### Step 1: Wake Up Your Neon Database ⚡

**IMPORTANT:** Your Neon database needs to be active before running migrations.

1. Visit: https://console.neon.tech
2. Select your project: `ep-orange-wind-a1qiydf1`
3. Wait for the database to show "Active" status (green indicator)
4. This usually takes 5-10 seconds

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 3: Run Database Setup

**Option A: Automatic Setup (Recommended)**
```bash
./setup-database.sh
```

**Option B: Manual Setup**
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Verify setup
npx prisma studio
```

### Step 4: Start Backend Server

```bash
# Development mode with auto-reload
npm run dev
```

Server runs at: `http://localhost:4000`

Test it: `http://localhost:4000/api/health`

### Step 5: Start Frontend

```bash
cd ../client
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

## 🎯 Testing Your Setup

### 1. Backend Health Check
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-15T...",
  "session": "active"
}
```

### 2. Database Connection
```bash
cd server
npx prisma studio
```
Opens database GUI at `http://localhost:5555`

### 3. Test GitHub Login
1. Visit: `http://localhost:3000/login`
2. Click "Sign in with GitHub"
3. Authorize the app
4. Should redirect to dashboard with your GitHub data

## 🔧 Environment Variables Reference

### Server `.env` (copy these placeholders into your local environment)
```env
# GitHub OAuth
GITHUB_CLIENT_ID=Ov23liR1G3ITDiY2HiGL
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

# Pinecone AI (Configured)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENV=asia-southeast1-gcp
PINECONE_INDEX=project-pulse
PINECONE_EMBEDDING=true

# Server
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## 📚 Available Features

### For Users
- ✅ Sign up with email/password or GitHub
- ✅ Create and manage projects
- ✅ Sync GitHub repositories with projects
- ✅ Create tasks with Kanban board (To Do, In Progress, Done)
- ✅ Assign tasks to team members
- ✅ Add comments to tasks
- ✅ AI-powered team member matching
- ✅ Send/receive team invitations
- ✅ View project activity feed
- ✅ Get real-time notifications
- ✅ View GitHub repositories
- ✅ Profile management with skills & interests

### For Developers
- ✅ REST API with authentication
- ✅ Prisma ORM with type safety
- ✅ Session-based + token-based auth
- ✅ GitHub OAuth integration
- ✅ Pinecone vector embeddings
- ✅ Database migrations
- ✅ Activity logging
- ✅ Notification system

## 🐛 Troubleshooting

### Database Connection Failed
```
Error: P1001: Can't reach database server
```

**Solution:**
1. Your Neon database is paused (auto-pauses after inactivity)
2. Go to Neon Console: https://console.neon.tech
3. Click your project → Wait for "Active" status
4. Retry: `npx prisma db push`

### Prisma Client Not Found
```
Cannot find module '@prisma/client'
```

**Solution:**
```bash
cd server
npx prisma generate
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solution:**
```bash
# Find and kill the process
lsof -ti:4000 | xargs kill -9

# Or change port in server/.env
PORT=4001
```

### CORS Errors
```
Access to fetch blocked by CORS policy
```

**Solution:** Server is configured for `localhost:3000`. If using different port:
```javascript
// server/src/index.js - Update CORS origins
```

## 🎨 Frontend Integration

Your frontend is already configured to use these endpoints:

```typescript
// Authentication
fetch('http://localhost:4000/api/auth/user', {
  credentials: 'include'
})

// Create Project
fetch('http://localhost:4000/api/projects', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, description })
})

// Get AI Matches
fetch('http://localhost:4000/api/team/match', {
  credentials: 'include'
})
```

## 📊 Database Schema Diagram

```
User
├── Projects (owner)
├── ProjectMembers (member of)
├── Tasks (assigned)
├── Activities
├── Notifications
└── Repositories

Project
├── Owner (User)
├── Members (ProjectMember[])
├── Tasks (Task[])
└── Activities (Activity[])

Task
├── Project
├── Assignee (User)
├── Comments (Comment[])
└── Activities (Activity[])
```

## 🚀 Next Steps

1. **Test the application:**
   - Login with GitHub
   - Create a project
   - Add tasks
   - Try team matching

2. **Explore the database:**
   ```bash
   npx prisma studio
   ```

3. **Add sample data** (optional):
   - Create multiple users
   - Set up skills/interests
   - Test AI matching

4. **Deploy** (when ready):
   - Deploy backend to Railway/Render
   - Deploy frontend to Vercel
   - Update environment variables

## 📖 Documentation

- **Backend API**: See `/server/README.md`
- **Prisma Schema**: `/server/prisma/schema.prisma`
- **Routes**: `/server/src/routes/*.routes.js`
- **Controllers**: `/server/src/controllers/*.controller.js`

## 🎯 Key Features to Test

1. **Authentication Flow**
   - GitHub OAuth login
   - Session persistence
   - Logout

2. **Project Management**
   - Create project from GitHub repo
   - Add team members
   - Track progress

3. **Task Management**
   - Create tasks in different columns
   - Assign to team members
   - Add comments
   - Move between columns

4. **AI Team Matching**
   - Update profile with skills
   - View matched teammates
   - Send invitations

5. **GitHub Integration**
   - View repositories
   - Sync with project
   - Create issues

## 🤝 Need Help?

- Check server logs: `npm run dev` output
- Open Prisma Studio: `npx prisma studio`
- Test endpoint: `curl http://localhost:4000/api/health`
- Review database: Check Neon Console

---

**You're all set! Your full-stack ProjectPulse application is ready to use! 🎉**

Start both servers and visit `http://localhost:3000` to begin.
