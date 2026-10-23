import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { adminGuard } from '../middleware/guards.js';

const router = Router();

// Every admin endpoint requires the predefined admin key
router.use(adminGuard);

router.get('/students', adminController.listStudents);
router.get('/teachers', adminController.listTeachers);

router.get('/keys',                adminController.listKeys);          // ?status=&ownerType=
router.post('/keys',               adminController.generateKey);       // { ownerType, ownerId, requestLimit? }
router.get('/keys/:id/usage',      adminController.getKeyUsage);       // ?limit=20
router.patch('/keys/:id/limit',    adminController.updateKeyLimit);    // { requestLimit }
router.patch('/keys/:id/revoke',   adminController.revokeKey);
router.patch('/keys/:id/reset',    adminController.resetKeyUsage);

export default router;
