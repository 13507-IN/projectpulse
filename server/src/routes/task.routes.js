import express from 'express';
import {
  getProjectTasks,
  getUserTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addTaskComment,
  getTaskComments,
} from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get('/user', getUserTasks);
router.get('/project/:projectId', getProjectTasks);
router.get('/:id', getTask);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/:id/comments', getTaskComments);
router.post('/:id/comments', addTaskComment);

export default router;
