import express from "express";
import * as tasksController from "../controllers/tasks.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// User tasks
router.get("/user", tasksController.getUserTasks);
router.get("/projects", tasksController.getProjectTasks);

// CRUD operations
router.post("/", tasksController.createTask);
router.get("/:id", tasksController.getTask);
router.put("/:id", tasksController.updateTask);
router.delete("/:id", tasksController.deleteTask);

// GitHub integration
router.post("/from-github", tasksController.createTaskFromGitHubIssue);
router.post("/:id/link-github", tasksController.linkTaskToGitHubIssue);
router.post("/:id/github", tasksController.linkToGitHubIssue);

export default router;
