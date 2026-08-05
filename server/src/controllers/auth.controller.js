import { getGitHubAccessToken, getGitHubUser } from "../utils/github.js";
import prisma from '../config/prisma.js';

// GitHub OAuth Login Initiator
export const githubLogin = (req, res) => {
    try {
        const missing = [];
        if (!process.env.GITHUB_CLIENT_ID) missing.push('GITHUB_CLIENT_ID');
        if (!process.env.GITHUB_CLIENT_SECRET) missing.push('GITHUB_CLIENT_SECRET');
        if (!process.env.GITHUB_CALLBACK_URL) missing.push('GITHUB_CALLBACK_URL');
        if (!process.env.FRONTEND_URL) missing.push('FRONTEND_URL');
        
        if (missing.length > 0) {
            console.error('❌ Missing required environment variables for GitHub OAuth:', missing);
            return res.status(500).json({
                error: 'Server is not properly configured for GitHub OAuth',
                missing
            });
        }

        const state = Math.random().toString(36).substring(2);
        req.session.oauthState = state;
        const scope = 'user:email repo';
        
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
            scope: scope,
            state: state,
            allow_signup: 'true'
        });
        
        const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        
        console.log('🔑 Initiating GitHub OAuth flow:', {
            callbackUrl: process.env.GITHUB_CALLBACK_URL,
            hasClientId: !!process.env.GITHUB_CLIENT_ID,
            hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
            state: state.substring(0, 8) + '...'
        });
        
        req.session.save((err) => {
            if (err) console.error('Session save error during OAuth init:', err);
            res.redirect(githubAuthUrl);
        });
    } catch (error) {
        console.error('❌ Error in githubLogin:', error);
        res.status(500).json({ error: 'Failed to initialize GitHub authentication' });
    }
};

// GitHub OAuth Callback Handler
export const githubCallback = async (req, res) => {
    const { code, state: stateFromGitHub, error: gitHubError, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginErrorUrl = `${frontendUrl}/login?error=oauth_failed`;
    
    if (gitHubError || !code) {
        console.error('❌ GitHub OAuth Error or missing code:', gitHubError);
        return res.redirect(`${loginErrorUrl}&reason=${encodeURIComponent(gitHubError || 'no_code')}`);
    }

    try {
        const accessToken = await getGitHubAccessToken(code);
        if (!accessToken) {
            return res.redirect(`${frontendUrl}/login?error=no_token`);
        }

        const githubUser = await getGitHubUser(accessToken);
        if (!githubUser || !githubUser.id) {
            throw new Error("Failed to fetch GitHub user data");
        }

        let user = await prisma.user.upsert({
            where: { githubId: String(githubUser.id) },
            update: {
                githubAccessToken: accessToken,
                name: githubUser.name || githubUser.login,
                email: githubUser.email || undefined,
                avatarUrl: githubUser.avatar_url,
                githubUsername: githubUser.login,
                bio: githubUser.bio || null,
                location: githubUser.location || null,
                company: githubUser.company || null,
                website: githubUser.blog || null,
                lastLogin: new Date(),
            },
            create: {
                githubId: String(githubUser.id),
                githubUsername: githubUser.login,
                email: githubUser.email || `${githubUser.login}@github.local`,
                name: githubUser.name || githubUser.login,
                githubAccessToken: accessToken,
                avatarUrl: githubUser.avatar_url,
                bio: githubUser.bio || null,
                location: githubUser.location || null,
                company: githubUser.company || null,
                website: githubUser.blog || null,
                lastLogin: new Date(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                githubUsername: true,
                avatarUrl: true,
                role: true
            }
        });

        req.session.userId = user.id;
        
        req.session.save(err => {
            if (err) console.error('Session save error:', err);

            const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
            
            // Set 30-day persistent user cookie
            res.cookie('user', JSON.stringify({
                id: user.id,
                login: user.githubUsername,
                name: user.name,
                email: user.email,
                avatar_url: user.avatarUrl,
                role: user.role
            }), {
                httpOnly: false,
                sameSite: isProd ? 'none' : 'lax',
                secure: isProd,
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                path: '/'
            });

            // Set 30-day persistent token cookies
            res.cookie('token', accessToken, {
                httpOnly: true,
                sameSite: isProd ? 'none' : 'lax',
                secure: isProd,
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            res.cookie('github_token', accessToken, {
                httpOnly: true,
                sameSite: isProd ? 'none' : 'lax',
                secure: isProd,
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            const redirectUrl = `${frontendUrl}/dashboard?auth=success&token=${accessToken}`;
            res.redirect(redirectUrl);
        });
    } catch (error) {
        console.error('❌ Error in githubCallback:', error);
        res.redirect(loginErrorUrl);
    }
};

// Google OAuth Login Initiator
export const googleLogin = (req, res) => {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`;

        const state = Math.random().toString(36).substring(2);
        req.session.oauthState = state;

        const scope = 'openid email profile';
        const params = new URLSearchParams({
            client_id: clientId || 'GOOGLE_CLIENT_ID_PLACEHOLDER',
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            state: state,
            prompt: 'select_account'
        });

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        console.log('🔑 Initiating Google OAuth flow with redirect URI:', redirectUri);

        req.session.save((err) => {
            if (err) console.error('Session save error during Google OAuth init:', err);
            res.redirect(googleAuthUrl);
        });
    } catch (error) {
        console.error('❌ Error in googleLogin:', error);
        res.status(500).json({ error: 'Failed to initialize Google authentication' });
    }
};

// Google OAuth Callback Handler
export const googleCallback = async (req, res) => {
    const { code, state: stateFromGoogle, error: googleError } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`;

    if (googleError || !code) {
        console.error('❌ Google OAuth Error or missing code:', googleError);
        return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    try {
        const tokenParams = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams.toString()
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error('Failed to exchange Google OAuth code:', errText);
            return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // Fetch user profile from Google UserInfo API
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!userRes.ok) {
            throw new Error('Failed to fetch Google user profile');
        }

        const googleUser = await userRes.json();

        // Upsert user in Prisma DB
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { googleId: googleUser.id },
                    { email: googleUser.email }
                ]
            }
        });

        if (user) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId: googleUser.id,
                    googleAccessToken: accessToken,
                    name: user.name || googleUser.name,
                    avatarUrl: user.avatarUrl || googleUser.picture,
                    lastLogin: new Date()
                }
            });
        } else {
            user = await prisma.user.create({
                data: {
                    googleId: googleUser.id,
                    googleAccessToken: accessToken,
                    email: googleUser.email,
                    name: googleUser.name || `${googleUser.given_name || ''} ${googleUser.family_name || ''}`.trim() || 'Google User',
                    firstName: googleUser.given_name,
                    lastName: googleUser.family_name,
                    avatarUrl: googleUser.picture,
                    role: 'developer',
                    lastLogin: new Date()
                }
            });
        }

        req.session.userId = user.id;
        req.session.save(err => {
            if (err) console.error('Session save error:', err);

            const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
            
            res.cookie('user', JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatarUrl,
                role: user.role
            }), {
                httpOnly: false,
                sameSite: isProd ? 'none' : 'lax',
                secure: isProd,
                maxAge: 30 * 24 * 60 * 60 * 1000,
                path: '/'
            });

            res.cookie('token', accessToken, {
                httpOnly: true,
                sameSite: isProd ? 'none' : 'lax',
                secure: isProd,
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            const redirectUrl = `${frontendUrl}/dashboard?auth=success&token=${accessToken}`;
            res.redirect(redirectUrl);
        });
    } catch (error) {
        console.error('❌ Error in googleCallback:', error);
        res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
};

export const logout = (req, res) => {
    // Clear session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
    });

    // Clear cookies
    res.clearCookie("token");
    res.clearCookie("github_token");
    res.clearCookie("user");
    res.clearCookie("projectpulse.sid");
    res.clearCookie("connect.sid");
    
    res.json({ message: "Logged out successfully" });
};

export const getUser = async (req, res) => {
    try {
        let userId = req.session?.userId;
        let token = null;

        // Check Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies?.token || req.cookies?.github_token) {
            token = req.cookies.token || req.cookies.github_token;
        }

        // If session userId is missing, lookup user by githubAccessToken or token
        if (!userId && token) {
            const dbUser = await prisma.user.findFirst({
                where: { githubAccessToken: token }
            });
            if (dbUser) {
                userId = dbUser.id;
                if (req.session) req.session.userId = dbUser.id;
            } else {
                try {
                    const githubUser = await getGitHubUser(token);
                    if (githubUser?.id) {
                        const foundUser = await prisma.user.findUnique({
                            where: { githubId: String(githubUser.id) }
                        });
                        if (foundUser) {
                            userId = foundUser.id;
                            if (req.session) req.session.userId = foundUser.id;
                        }
                    }
                } catch (e) {
                    console.warn('GitHub token validation failed:', e.message);
                }
            }
        }

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    githubUsername: true,
                    avatarUrl: true,
                    bio: true,
                    location: true,
                    company: true,
                    website: true,
                    role: true,
                    skills: true,
                    interests: true,
                },
            });

            if (user) {
                return res.json({ 
                    user: {
                        id: user.id,
                        login: user.githubUsername,
                        name: user.name,
                        email: user.email,
                        avatar_url: user.avatarUrl,
                        bio: user.bio,
                        location: user.location,
                        company: user.company,
                        website: user.website,
                        role: user.role,
                        skills: user.skills,
                        interests: user.interests,
                        access_token: token || undefined
                    }
                });
            }
        }

        // Fallback to client-side user cookie if present
        const userCookie = req.cookies?.user;
        if (userCookie) {
            try {
                return res.json({ user: JSON.parse(userCookie) });
            } catch (e) {}
        }

        res.json({ user: null, authenticated: false });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

export const exchangeCode = async (req, res) => {
    const { code, callback_url } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Authorization code not provided" });
    }

    try {
        // Get access token using utility function
        const accessToken = await getGitHubAccessToken(code);
        
        if (!accessToken) {
            return res.status(400).json({ error: "Failed to get access token" });
        }

        // Fetch GitHub user profile using utility function
        const user = await getGitHubUser(accessToken);

        res.json({
            access_token: accessToken,
            user: {
                id: user.id,
                login: user.login,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url
            }
        });
    } catch (err) {
        console.error("GitHub OAuth Error:", err.message);
        res.status(400).json({ error: "OAuth exchange failed" });
    }
};

export const verifyToken = (req, res) => {
    // If we get here, the token is valid
    res.json({ valid: true, user: req.user });
};

export const createSession = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Verify the token by fetching user info from GitHub
        const githubUser = await getGitHubUser(token);
        
        if (!githubUser || !githubUser.id) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Find or create user in database
        const user = await prisma.user.upsert({
            where: { githubId: String(githubUser.id) },
            update: {
                githubAccessToken: token,
                name: githubUser.name || githubUser.login,
                email: githubUser.email || undefined,
                avatarUrl: githubUser.avatar_url,
                githubUsername: githubUser.login,
                lastLogin: new Date(),
            },
            create: {
                githubId: String(githubUser.id),
                githubUsername: githubUser.login,
                email: githubUser.email || `${githubUser.login}@github.local`,
                name: githubUser.name || githubUser.login,
                githubAccessToken: token,
                avatarUrl: githubUser.avatar_url,
                lastLogin: new Date(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                githubUsername: true,
                avatarUrl: true,
                role: true
            }
        });

        // Set session
        req.session.userId = user.id;
        await new Promise((resolve, reject) => {
            req.session.save(err => err ? reject(err) : resolve());
        });

        res.json({ user });
    } catch (error) {
        console.error('Session creation failed:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
};

export const authDebug = (req, res) => {
    // Expose only non-sensitive diagnostics
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
    res.json({
        node_env: process.env.NODE_ENV,
        has_github_client_id: Boolean(process.env.GITHUB_CLIENT_ID),
        has_github_client_secret: Boolean(process.env.GITHUB_CLIENT_SECRET),
        github_callback_url: process.env.GITHUB_CALLBACK_URL,
        frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
        session_cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        },
        cors_allowed_origins: allowedOrigins
    });
};
