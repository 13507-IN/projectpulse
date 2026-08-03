import { getGitHubUser } from "../utils/github.js";
import prisma from '../config/prisma.js';

// Session and Token based authentication middleware with multi-layer fallback
export const authenticateToken = async (req, res, next) => {
    try {
        // 1. Session check
        if (req.session && req.session.userId) {
            const user = await prisma.user.findUnique({
                where: { id: req.session.userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    githubUsername: true,
                    githubAccessToken: true,
                    avatarUrl: true,
                    role: true,
                    skills: true,
                    interests: true,
                },
            });

            if (user) {
                req.user = user;
                req.token = user.githubAccessToken;
                return next();
            }
        }

        // 2. Token extraction from Bearer header, cookies, or query params
        const authHeader = req.headers.authorization;
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && (req.cookies.token || req.cookies.github_token)) {
            token = req.cookies.token || req.cookies.github_token;
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        // 3. Fallback: Lookup user from non-httpOnly user cookie if token is missing
        if (!token && req.cookies && req.cookies.user) {
            try {
                const cookieUserData = JSON.parse(req.cookies.user);
                if (cookieUserData && cookieUserData.id) {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: cookieUserData.id }
                    });
                    if (dbUser) {
                        if (req.session) req.session.userId = dbUser.id;
                        req.user = dbUser;
                        req.token = dbUser.githubAccessToken;
                        return next();
                    }
                }
            } catch (e) {}
        }

        if (!token) {
            console.log('No authentication token found in request');
            return res.status(401).json({ error: "Authentication required. Please log in again." });
        }

        // 4. Fast DB lookup for user matching this token
        let dbUser = await prisma.user.findFirst({
            where: { githubAccessToken: token }
        });

        if (dbUser) {
            if (req.session) req.session.userId = dbUser.id;
            req.user = dbUser;
            req.token = token;
            return next();
        }

        // 5. Fallback: Verify token with GitHub API if not found in local DB
        const user = await getGitHubUser(token);
        
        if (!user) {
            console.log('Invalid or expired GitHub token');
            return res.status(401).json({ 
                error: "Your session has expired. Please log in again.",
                requiresReauth: true
            });
        }

        // Upsert user in DB
        dbUser = await prisma.user.upsert({
            where: { githubId: String(user.id) },
            update: {
                githubAccessToken: token,
                lastLogin: new Date(),
            },
            create: {
                githubId: String(user.id),
                githubUsername: user.login,
                email: user.email || `${user.login}@github.local`,
                name: user.name || user.login,
                githubAccessToken: token,
                avatarUrl: user.avatar_url,
                lastLogin: new Date(),
            },
        });

        if (req.session) {
            req.session.userId = dbUser.id;
        }

        req.user = dbUser;
        req.token = token;
        next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        if (error.response) {
            console.error("GitHub API response:", error.response.data);
        }
        res.status(401).json({ 
            error: "Authentication failed. Please try logging in again.",
            requiresReauth: true
        });
    }
};

// Optional: Middleware to refresh token if needed
export const refreshTokenIfNeeded = async (req, res, next) => {
    try {
        // Skip if we already have a valid session
        if (req.session && req.session.user) {
            return next();
        }
        
        // Check for refresh token
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            return next();
        }

        // Here you would implement token refresh logic
        // For now, we'll just pass through
        next();
    } catch (error) {
        console.error('Token refresh error:', error);
        next();
    }
};

// Export requireAuth as an alias for authenticateToken
export const requireAuth = authenticateToken;
