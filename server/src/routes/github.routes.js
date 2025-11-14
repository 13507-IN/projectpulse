const express = require("express");
const { getGitHubRepos } = require("../utils/github");
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    const token = req.cookies.github_token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    req.githubToken = token;
    next();
};

// Get user's GitHub repositories
router.get("/repos", requireAuth, async (req, res) => {
    try {
        const repos = await getGitHubRepos(req.githubToken);
        res.json({ repos });
    } catch (error) {
        console.error("Error fetching repos:", error.message);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
});

// Sync specific repository
router.post("/sync/:owner/:repo", requireAuth, async (req, res) => {
    try {
        const { owner, repo } = req.params;
        
        // Here you would implement the actual sync logic
        // For now, we'll just return a success message
        res.json({ 
            message: `Repository ${owner}/${repo} synced successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error syncing repo:", error.message);
        res.status(500).json({ error: "Failed to sync repository" });
    }
});

module.exports = router;
