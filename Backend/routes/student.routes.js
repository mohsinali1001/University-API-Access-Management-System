import { Router } from 'express';
import studentController from '../controllers/student.controller.js';
import { studentGuard } from '../middleware/guards.js';

const router = Router();

// Student key only. There is deliberately NO /:id route: a student can only
// ever see the record that belongs to their own API key.
router.use(studentGuard);

router.get('/me',       studentController.getProfile);
router.get('/me/marks', studentController.getMarks);

export default router;
