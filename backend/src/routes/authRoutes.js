import express from 'express';
import {
  signup,
  login,
  refreshTokens,
  logout,
  logoutAll,
  getProfile,
  changePassword,
  signupValidation,
  loginValidation,
  refreshTokenValidation
} from '../controllers/authController.js';
import { authenticateToken, userRateLimit } from '../middleware/auth.js';
import { requestId, responseTime } from '../middleware/logger.js';

const router = express.Router();

// Add middleware
router.use(requestId);
router.use(responseTime);

// Public routes
router.post('/signup', signupValidation, userRateLimit(15 * 60 * 1000, 5), signup);
router.post('/login', loginValidation, userRateLimit(15 * 60 * 1000, 10), login);
router.post('/refresh', refreshTokenValidation, userRateLimit(15 * 60 * 1000, 20), refreshTokens);

// Protected routes
router.use(authenticateToken);

router.get('/profile', getProfile);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);
router.post('/change-password', changePassword);

export default router;