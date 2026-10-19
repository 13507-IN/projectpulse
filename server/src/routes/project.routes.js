import express from 'express';
import {
  getUserProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats,
  discoverProjects,
} from '../controllers/project.controller.js';
import {
  applyToProject,
  getProjectApplications,
  respondToProjectApplication,
} from '../controllers/projectApplication.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get('/discovery', discoverProjects);
router.post('/:id/applications', applyToProject);
router.get('/:id/applications', getProjectApplications);
router.put('/applications/:applicationId/respond', respondToProjectApplication);
router.get('/', getUserProjects);
router.get('/stats', getProjectStats);
router.get('/:id', getProject);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', addProjectMember);
router.delete('/:id/members/:memberId', removeProjectMember);

export default router;
