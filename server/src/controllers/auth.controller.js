import { getGitHubAccessToken, getGitHubUser } from "../utils/github.js";
import prisma from '../config/prisma.js';

export const githubLogin = (req, res) => {
    try {
        // Validate required environment variables
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

        // Generate a secure state token
        const state = Math.random().toString(36).substring(2);
        
        // Store state in session for CSRF protection
        req.session.oauthState = state;
        
        // Define required OAuth scopes
        const scope = 'user:email repo';
        
        // Build the GitHub OAuth URL
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
            state: state.substring(0, 8) + '...' // Log partial state for debugging
        });
        
        // Redirect to GitHub for authentication
        res.redirect(githubAuthUrl);
    } catch (error) {
        console.error('❌ Error in githubLogin:', error);
        res.status(500).json({
            error: 'Failed to initialize GitHub authentication',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const githubCallback = async (req, res) => {
    const { code, state: stateFromGitHub, error: gitHubError, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginErrorUrl = `${frontendUrl}/login?error=oauth_failed`;
    
    // Log the callback for debugging
    console.log('🔄 GitHub OAuth Callback received:', { 
        hasCode: !!code, 
        state: stateFromGitHub ? `${stateFromGitHub.substring(0, 8)}...` : 'none',
        error: gitHubError || 'none',
        errorDescription: error_description || 'none'
    });

    // Handle OAuth errors from GitHub
    if (gitHubError) {
        console.error('❌ GitHub OAuth Error:', { 
            error: gitHubError, 
            description: error_description,
            state: stateFromGitHub 
        });
        return res.redirect(`${loginErrorUrl}&reason=${encodeURIComponent(gitHubError)}`);
    }

    // Verify we have the required authorization code
    if (!code) {
        console.error('❌ No authorization code received from GitHub');
        return res.redirect(`${loginErrorUrl}&reason=no_code`);
    }

    // Verify state parameter to prevent CSRF
    if (!stateFromGitHub || stateFromGitHub !== req.session.oauthState) {
        console.error('❌ Invalid or missing state parameter', {
            received: stateFromGitHub,
            expected: req.session.oauthState ? req.session.oauthState.substring(0, 8) + '...' : 'none'
        });
        return res.redirect(`${loginErrorUrl}&reason=invalid_state`);
    }
    
    // Clear the state after it's been used
    delete req.session.oauthState;

    try {
        console.log('Exchanging authorization code for access token...');
        const accessToken = await getGitHubAccessToken(code);
        
        if (!accessToken) {
            console.error('No access token received from GitHub');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_token`);
        }

        console.log('Fetching GitHub user profile...');
        const githubUser = await getGitHubUser(accessToken);
        
        if (!githubUser || !githubUser.id) {
            console.error('Invalid GitHub user data received:', githubUser);
            throw new Error("Failed to fetch GitHub user data");
        }

        // Find or create user in database
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

        // Set user session
        req.session.userId = user.id;
        
        // Prepare redirect URL
        const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL('/dashboard', frontendBaseUrl);
        redirectUrl.searchParams.set('login', 'success');
        
        // Save session and handle redirection
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Failed to save session' });
            }

            // Set user info in a non-httpOnly cookie for client-side access
            res.cookie('user', JSON.stringify({
                id: user.id,
                login: user.githubUsername,
                name: user.name,
                email: user.email,
                avatar_url: user.avatarUrl,
                role: user.role
            }), {
                httpOnly: false,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                path: '/',
                domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost'
            });

            // Set secure httpOnly token cookie
            res.cookie('token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost'
            });

            // Redirect to frontend with success state
            const redirectUrl = state 
                ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}${decodeURIComponent(state)}`
                : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
                
            res.redirect(redirectUrl);
        });
    } catch (err) {
        console.error("GitHub OAuth Error:", err.message);
        if (err.response) {
            console.error('GitHub OAuth error response:', err.response.data);
        }
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
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
    res.clearCookie("github_token");
    res.clearCookie("user");
    res.clearCookie("connect.sid");
    
    res.json({ message: "Logged out successfully" });
};

export const getUser = async (req, res) => {
    try {
        // Check if user is authenticated via session
        if (req.session.userId) {
            const user = await prisma.user.findUnique({
                where: { id: req.session.userId },
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
                    }
                });
            }
        }

        // Fallback to cookie-based auth
        const userCookie = req.cookies.user;
        if (userCookie) {
            return res.json({ user: JSON.parse(userCookie) });
        }

        res.status(401).json({ error: "Not authenticated" });
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
