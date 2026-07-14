import express from "express";
import axios from "axios";
import { getGitHubRepositories, getGitHubIssues, createGitHubIssue, updateGitHubIssue } from "../utils/github.js";
import { authenticateToken } from "../middleware/auth.js";
import prisma from '../config/prisma.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user's repositories
router.get("/repositories", async (req, res) => {
    try {
        const repositories = await getGitHubRepositories(req.token);
        
        // Cache repositories in database
        if (repositories && repositories.length > 0) {
            await Promise.all(
                repositories.map(repo => 
                    prisma.repository.upsert({
                        where: { githubId: repo.id },
                        update: {
                            name: repo.name,
                            fullName: repo.full_name,
                            description: repo.description,
                            url: repo.html_url,
                            language: repo.language,
                            private: repo.private,
                            fork: repo.fork,
                            stars: repo.stargazers_count,
                            forks: repo.forks_count,
                            openIssues: repo.open_issues_count,
                            updatedAt: new Date(repo.updated_at),
                            lastFetchedAt: new Date(),
                        },
                        create: {
                            githubId: repo.id,
                            name: repo.name,
                            fullName: repo.full_name,
                            description: repo.description,
                            url: repo.html_url,
                            language: repo.language,
                            private: repo.private,
                            fork: repo.fork,
                            stars: repo.stargazers_count,
                            forks: repo.forks_count,
                            openIssues: repo.open_issues_count,
                            updatedAt: new Date(repo.updated_at),
                            userId: req.user.id,
                        },
                    })
                )
            ).catch(err => console.error('Error caching repositories:', err));
        }
        
        res.json(repositories);
    } catch (error) {
        console.error("Error fetching repositories:", error.message);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
});

// Get repository details
router.get("/repositories/:owner/:repo", async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                Authorization: `Bearer ${req.token}`,
                "User-Agent": "ProjectPulse-App",
                Accept: "application/vnd.github.v3+json"
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching repository:", error.message);
        res.status(500).json({ error: "Failed to fetch repository" });
    }
});

// Get user's issues
router.get("/issues", async (req, res) => {
    try {
        const issues = await getGitHubIssues(req.token);
        res.json(issues);
    } catch (error) {
        console.error("Error fetching issues:", error.message);
        res.status(500).json({ error: "Failed to fetch issues" });
    }
});

// Create new GitHub issue
router.post("/issues", async (req, res) => {
    try {
        const { repository, title, body, labels } = req.body;
        const issue = await createGitHubIssue(req.token, repository, title, body, labels);
        res.status(201).json(issue);
    } catch (error) {
        console.error("Error creating issue:", error.message);
        res.status(500).json({ error: "Failed to create issue" });
    }
});

// Update GitHub issue
router.put("/issues/:number", async (req, res) => {
    try {
        const { repository, title, body, state, labels } = req.body;
        const issue = await updateGitHubIssue(req.token, repository, req.params.number, {
            title, body, state, labels
        });
        res.json(issue);
    } catch (error) {
        console.error("Error updating issue:", error.message);
        res.status(500).json({ error: "Failed to update issue" });
    }
});

// Sync repository with project
router.post("/sync/:owner/:repo", async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const userId = req.user.id;

        // Fetch repository details from GitHub
        const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                Authorization: `Bearer ${req.token}`,
                "User-Agent": "ProjectPulse-App",
                Accept: "application/vnd.github.v3+json"
            }
        });

        const repoData = repoResponse.data;

        // Create or update project
        const project = await prisma.project.upsert({
            where: { githubRepoId: String(repoData.id) },
            update: {
                name: repoData.name,
                description: repoData.description,
                githubRepoUrl: repoData.html_url,
                githubRepoName: repoData.full_name,
                repoOwner: owner,
                repoPrivate: repoData.private,
                lastSyncedAt: new Date(),
            },
            create: {
                name: repoData.name,
                description: repoData.description,
                githubRepoId: String(repoData.id),
                githubRepoUrl: repoData.html_url,
                githubRepoName: repoData.full_name,
                repoOwner: owner,
                repoPrivate: repoData.private,
                ownerId: userId,
                lastSyncedAt: new Date(),
            },
        });

        res.json({ 
            message: "Successfully synced repository with project",
            project 
        });
    } catch (error) {
        console.error("Error syncing repository:", error.message);
        res.status(500).json({ error: "Failed to sync repository" });
    }
});

export default router;
