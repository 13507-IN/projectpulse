import express from 'express';
import {
  getMatchedTeammates,
  sendTeamInvite,
  getUserInvites,
  respondToInvite,
  updateMatchingProfile,
} from '../controllers/team.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get('/match', getMatchedTeammates);
router.post('/invite', sendTeamInvite);
router.get('/invites', getUserInvites);
router.post('/invites/:id/respond', respondToInvite);
router.put('/profile', updateMatchingProfile);

export default router;
