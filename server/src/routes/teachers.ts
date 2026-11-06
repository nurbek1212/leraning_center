import { Router } from 'express';
import * as ctrl from '../controllers/teacherController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { idParam, listQuery, teacherCreateSchema, teacherUpdateSchema } from '../validators';

const router = Router();

router.use(authenticate, allowRoles('admin'));

router.get('/', validate(listQuery, 'query'), ctrl.list);
router.get('/:id', validate(idParam, 'params'), ctrl.getOne);
router.post('/', validate(teacherCreateSchema), ctrl.create);
router.put('/:id', validate(idParam, 'params'), validate(teacherUpdateSchema), ctrl.update);
router.delete('/:id', validate(idParam, 'params'), ctrl.remove);

export default router;
