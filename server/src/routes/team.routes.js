import express from 'express';
import {
  getMatchedTeammates,
  sendTeamInvite,
  getUserInvites,
  respondToInvite,
  updateMatchingProfile,
  initiateVerification,
  setVerificationQuestions,
  submitVerificationAnswers,
  evaluateVerification,
  getVerificationStatus,
  getVerifications,
} from '../controllers/team.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get('/match', getMatchedTeammates);
router.get('/', getMatchedTeammates); // Fallback for client fetching /api/team
router.post('/invite', sendTeamInvite);
router.get('/invites', getUserInvites);
router.post('/invites/:id/respond', respondToInvite);
router.put('/profile', updateMatchingProfile);

// Skillset Verification endpoints
router.post('/verification/initiate', initiateVerification);
router.post('/verification/:id/questions', setVerificationQuestions);
router.post('/verification/:id/answers', submitVerificationAnswers);
router.post('/verification/:id/verify', evaluateVerification);
router.get('/verification', getVerifications);
router.get('/verification/:id', getVerificationStatus);

export default router;

