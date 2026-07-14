import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  registerUser,
  loginUser,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', requireAuth, getUserProfile);
router.put('/profile', requireAuth, updateUserProfile);
router.get('/', requireAuth, getAllUsers);

export default router;
