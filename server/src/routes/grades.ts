import { Router } from 'express';
import * as ctrl from '../controllers/gradeController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { gradeCreateSchema, gradeQuery, gradeUpdateSchema, idParam } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', allowRoles('admin', 'teacher'), validate(gradeQuery, 'query'), ctrl.list);
router.post('/', allowRoles('teacher'), validate(gradeCreateSchema), ctrl.create);
router.put('/:id', allowRoles('teacher'), validate(idParam, 'params'), validate(gradeUpdateSchema), ctrl.update);
router.delete('/:id', allowRoles('teacher'), validate(idParam, 'params'), ctrl.remove);

export default router;
