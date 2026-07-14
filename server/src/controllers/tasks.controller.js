import { getGitHubUser, getGitHubRepositories, getGitHubIssues, createGitHubIssue } from "../utils/github.js";

// In-memory storage for demo (replace with database in production)
let tasks = [];
let taskIdCounter = 1;

export const getUserTasks = async (req, res) => {
    try {
        const userTasks = tasks.filter(task => task.assignee === req.user.login);
        res.json(userTasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProjectTasks = async (req, res) => {
    try {
        // Return all tasks for now (in production, filter by user's projects)
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createTask = async (req, res) => {
    try {
        const { title, description, priority, status, project, assignee } = req.body;
        
        const newTask = {
            id: taskIdCounter++,
            title,
            description: description || '',
            status: status || 'todo',
            priority: priority || 'medium',
            assignee: assignee || req.user.login,
            project: project || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.login
        };

        tasks.push(newTask);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getTask = async (req, res) => {
    try {
        const task = tasks.find(t => t.id === parseInt(req.params.id));
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTask = async (req, res) => {
    try {
        const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
        if (taskIndex === -1) {
            return res.status(404).json({ error: "Task not found" });
        }

        const updatedTask = {
            ...tasks[taskIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        tasks[taskIndex] = updatedTask;
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
        if (taskIndex === -1) {
            return res.status(404).json({ error: "Task not found" });
        }

        tasks.splice(taskIndex, 1);
        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createTaskFromGitHubIssue = async (req, res) => {
    try {
        const { issueId } = req.body;
        const token = req.cookies.github_token;
        
        // Get issue details from GitHub
        const issues = await getGitHubIssues(token);
        const issue = issues.find(i => i.id === issueId);
        
        if (!issue) {
            return res.status(404).json({ error: "GitHub issue not found" });
        }

        const newTask = {
            id: taskIdCounter++,
            title: issue.title,
            description: issue.body || '',
            status: issue.state === 'open' ? 'todo' : 'completed',
            priority: 'medium',
            assignee: issue.assignee ? issue.assignee.login : req.user.login,
            project: issue.repository_url ? issue.repository_url.split('/').pop() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.login,
            githubIssueId: issue.number,
            githubIssueUrl: issue.html_url
        };

        tasks.push(newTask);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const linkTaskToGitHubIssue = async (req, res) => {
    try {
        const { repository, issueNumber } = req.body;
        const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: "Task not found" });
        }

        const updatedTask = {
            ...tasks[taskIndex],
            githubIssueId: issueNumber,
            githubRepository: repository,
            updatedAt: new Date().toISOString()
        };

        tasks[taskIndex] = updatedTask;
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const linkToGitHubIssue = async (req, res) => {
    try {
        const { issueNumber } = req.body;
        const taskIndex = tasks.findIndex(t => t.id === parseInt(req.params.id));
        
        if (taskIndex === -1) {
            return res.status(404).json({ error: "Task not found" });
        }

        const updatedTask = {
            ...tasks[taskIndex],
            githubIssueId: issueNumber,
            updatedAt: new Date().toISOString()
        };

        tasks[taskIndex] = updatedTask;
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
