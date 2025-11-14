const { getGitHubAccessToken, getGitHubUser } = require("../utils/github");

exports.githubLogin = (req, res) => {
    const redirectURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email repo&redirect_uri=${process.env.GITHUB_CALLBACK_URL}`;
    
    res.redirect(redirectURL);
};

exports.githubCallback = async (req, res) => {
    const code = req.query.code;

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

        // Store token and user info in secure cookies
        res.cookie("github_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.cookie("user", JSON.stringify({
            id: user.id,
            login: user.login,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url
        }), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Redirect to frontend dashboard
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?auth=success`);
    } catch (err) {
        console.error("GitHub OAuth Error:", err.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
};

exports.logout = (req, res) => {
    res.clearCookie("github_token");
    res.clearCookie("user");
    res.json({ message: "Logged out successfully" });
};

exports.getUser = (req, res) => {
    const user = req.cookies.user;
    if (user) {
        res.json({ user: JSON.parse(user) });
    } else {
        res.status(401).json({ error: "Not authenticated" });
    }
};
