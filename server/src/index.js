import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import githubRoutes from "./routes/github.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import userRoutes from "./routes/user.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import teamRoutes from "./routes/team.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import githubWebhookRoutes from "./routes/github-webhook.routes.js";
import { authenticateToken } from './middleware/auth.js';
import { initPinecone } from './services/pinecone.service.js';

dotenv.config();

const app = express();

// Trust reverse proxy headers on Render/Vercel for HTTPS secure cookie detection
app.set('trust proxy', 1);

// Initialize Pinecone for AI matching
initPinecone().catch(err => {
    console.error('Failed to initialize Pinecone:', err);
});

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || Boolean(process.env.RENDER_SERVICE_ID);

// Configure CORS with proper credentials support
const allowedOrigins = [
    process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.warn('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'X-CSRF-Token'],
    exposedHeaders: ['set-cookie'],
    maxAge: 600,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'projectpulse.sid',
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
    },
    rolling: true
};

// Use Redis for session store in production, fallback to memory in development
const setupSessionStore = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    try {
      const redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error('Failed to connect to Redis after multiple attempts');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 5000);
          }
        }
      });

      redisClient.on('error', (err) => 
        console.error('Redis Client Error:', err.message)
      );

      await redisClient.connect();
      
      sessionConfig.store = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400 // 24 hours
      });
      
      console.log('✅ Connected to Redis for session storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis, using in-memory session store:', error.message);
      return false;
    }
  } else {
    console.log('ℹ️ Using in-memory session store for development');
    return true;
  }
};

// Initialize session store before starting the server
const initServer = async () => {
  await setupSessionStore();
  
  // Session middleware
  app.use(session(sessionConfig));
  
  // Log session info for debugging
  app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    // Don't log full session in production for security
    if (process.env.NODE_ENV !== 'production') {
      console.log('Session data:', req.session);
    }
    next();
  });

  // API Routes
  app.use("/api/github/webhooks", githubWebhookRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/activities", activityRoutes);
  app.use("/api/github", authenticateToken, githubRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      session: req.sessionID ? 'active' : 'none',
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  // Error handling middleware - must be after all other middleware and routes
  app.use((err, req, res, next) => {
      console.error('Error:', err.stack);
      res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  });
  
  // Start the server
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origins:`, [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ]);
  });
};

// Start the server
initServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
