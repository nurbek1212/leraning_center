import { Router } from 'express';
import * as ctrl from '../controllers/attendanceController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { attendanceCreateSchema, attendanceQuery } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', allowRoles('admin', 'teacher'), validate(attendanceQuery, 'query'), ctrl.list);
router.post('/', allowRoles('teacher'), validate(attendanceCreateSchema), ctrl.save);

export default router;
