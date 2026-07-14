# ProjectPulse Backend Server

Comprehensive backend API built with Express.js, Prisma ORM, PostgreSQL (Neon), and Pinecone for AI matching.

## 🚀 Features

### Core Functionality
- ✅ **User Authentication** - GitHub OAuth & Email/Password
- ✅ **Project Management** - Create, update, delete projects
- ✅ **Task Management** - Kanban-style task board with comments
- ✅ **Team Collaboration** - AI-powered team matching using Pinecone
- ✅ **GitHub Integration** - Repository sync, issues management
- ✅ **Activity Tracking** - Project and task activity logs
- ✅ **Notifications** - Real-time user notifications
- ✅ **Database** - Prisma ORM with PostgreSQL (Neon)

### AI Features
- **Team Matching** - Uses Pinecone vector embeddings for intelligent teammate recommendations
- **Skills Matching** - Match users based on skills, interests, availability, and experience
- **Fallback Algorithm** - Rule-based matching when Pinecone is unavailable

## 📋 Prerequisites

- Node.js >= 16.0.0
- PostgreSQL database (Neon recommended)
- GitHub OAuth App credentials
- Pinecone API key (optional, for AI matching)

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

```bash
cd server
npm install
```

### Step 2: Configure Environment Variables

Your `.env` file should contain:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Server
NODE_ENV=development
PORT=4000
SESSION_SECRET=your-secret-key-here

# Pinecone (Optional - for AI matching)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENV=your_pinecone_environment
PINECONE_INDEX=project-pulse
PINECONE_EMBEDDING=true
```

### Step 3: Wake Up Your Neon Database

**Important:** Neon databases auto-pause after inactivity. Before running migrations:

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click on your database
4. Wait for it to wake up (indicated by green "Active" status)

Alternatively, make a test connection to wake it:
```bash
# Test connection
npx prisma db execute --stdin <<< "SELECT 1;"
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Run Database Migrations

```bash
# Push schema to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init
```

### Step 6: Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will be running at: `http://localhost:4000`

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout user

### Users (`/api/users`)
- `POST /api/users/register` - Register with email/password
- `POST /api/users/login` - Login with email/password
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)
- `GET /api/users` - Get all users with filters (protected)

### Projects (`/api/projects`)
- `GET /api/projects` - Get user's projects
- `GET /api/projects/stats` - Get project statistics
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add team member
- `DELETE /api/projects/:id/members/:memberId` - Remove member

### Tasks (`/api/tasks`)
- `GET /api/tasks/user` - Get user's tasks
- `GET /api/tasks/project/:projectId` - Get project tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/:id/comments` - Get task comments
- `POST /api/tasks/:id/comments` - Add comment

### Team Matching (`/api/team`)
- `GET /api/team/match` - Get AI-matched teammates
- `POST /api/team/invite` - Send team invitation
- `GET /api/team/invites` - Get user's invitations
- `POST /api/team/invites/:id/respond` - Respond to invitation
- `PUT /api/team/profile` - Update matching profile

### Notifications (`/api/notifications`)
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Activities (`/api/activities`)
- `GET /api/activities/project/:projectId` - Get project activities
- `GET /api/activities/user` - Get user activities

### GitHub (`/api/github`)
- `GET /api/github/repositories` - Get user's repositories
- `GET /api/github/repositories/:owner/:repo` - Get repo details
- `GET /api/github/issues` - Get user's issues
- `POST /api/github/issues` - Create GitHub issue
- `PUT /api/github/issues/:number` - Update issue
- `POST /api/github/sync/:owner/:repo` - Sync repo with project

## 🗄️ Database Schema

The database includes the following models:

- **User** - User accounts (GitHub OAuth or email/password)
- **Project** - Projects with GitHub integration
- **ProjectMember** - Team members and roles
- **Task** - Tasks with Kanban columns
- **Comment** - Task comments
- **Activity** - Activity feed
- **TeamInvite** - Team invitations
- **Notification** - User notifications
- **Repository** - Cached GitHub repositories
- **MatchScore** - AI match scores between users

## 🔐 Authentication Flow

1. User clicks "Login with GitHub" on frontend
2. Redirected to GitHub OAuth page
3. User authorizes the app
4. GitHub redirects to `/api/auth/github/callback`
5. Backend exchanges code for access token
6. Backend creates/updates user in database
7. Backend sets session cookie
8. User redirected to dashboard

## 🎯 AI Team Matching

The AI matching system uses:

1. **Pinecone Vector Database** - Stores user profile embeddings
2. **Skill Matching** - Analyzes common skills (40% weight)
3. **Interest Matching** - Compares interests (30% weight)
4. **Availability Matching** - Considers work availability (15% weight)
5. **Experience Complementarity** - Balances experience levels (15% weight)

Fallback: If Pinecone is unavailable, uses rule-based matching algorithm.

## 🐛 Troubleshooting

### Database Connection Failed

```bash
Error: P1001: Can't reach database server
```

**Solution:** Your Neon database is paused. Wake it up:
1. Visit Neon Console
2. Click on your database
3. Wait for it to become active
4. Retry migration: `npx prisma db push`

### Prisma Client Not Generated

```bash
Error: Cannot find module '@prisma/client'
```

**Solution:** Run `npx prisma generate`

### Session Not Persisting

**Solution:** Check that:
1. Cookies are enabled in browser
2. CORS credentials are set to `true`
3. Frontend uses `credentials: 'include'` in fetch requests

### Pinecone Errors

If Pinecone is not configured, the app will:
- Log a warning
- Continue using fallback matching algorithm
- All features work except AI-enhanced matching

## 📊 Database Management

```bash
# Open Prisma Studio (GUI for database)
npx prisma studio

# View database schema
npx prisma db pull

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Seed database (if seed file exists)
npx prisma db seed
```

## 🚢 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
SESSION_SECRET=strong-random-secret
REDIS_URL=your_redis_url (optional, for session store)
```

### Deploy to Vercel/Railway/Render

1. Connect your Git repository
2. Set environment variables
3. Set build command: `npm install && npx prisma generate`
4. Set start command: `npm start`
5. Deploy!

## 📝 Development Notes

- **ES Modules:** Uses `import/export` syntax (not `require`)
- **Type Safety:** Consider adding TypeScript for better DX
- **Testing:** Add tests with Jest or Vitest
- **Rate Limiting:** Add rate limiting for production
- **Logging:** Consider Winston or Pino for structured logging
- **Caching:** Use Redis for session store in production

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

MIT License - feel free to use for your projects!
