import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import studentRoutes from './student.routes.js';
import teacherRoutes from './teacher.routes.js';

const router = Router();

// Public (no API key needed)
router.use('/health', healthRoutes);

// Any valid API key
router.use('/auth', authRoutes);

// Role-protected
router.use('/admin',   adminRoutes);    // admin key
router.use('/student', studentRoutes);  // student keys
router.use('/teacher', teacherRoutes);  // teacher keys

export default router;
