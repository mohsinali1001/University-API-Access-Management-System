import { Router } from 'express';
import teacherController from '../controllers/teacher.controller.js';
import { teacherGuard } from '../middleware/guards.js';

const router = Router();

// Teacher key only
router.use(teacherGuard);

router.get('/me',                  teacherController.getProfile);
router.get('/students',            teacherController.listStudents);      // ?search=&department=&semester=
router.get('/students/:id',        teacherController.getStudent);
router.get('/students/:id/marks',  teacherController.getStudentMarks);
router.get('/marks',               teacherController.listAllMarks);      // ?subjectId=

export default router;
