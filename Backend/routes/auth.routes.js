import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { anyKeyGuard } from '../middleware/guards.js';

const router = Router();

router.get('/me', anyKeyGuard, authController.me);

export default router;
