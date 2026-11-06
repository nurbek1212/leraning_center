import { Router } from 'express';
import * as ctrl from '../controllers/gradingController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { gradingSchemeSchema, subjectIdParam } from '../validators';

const router = Router();

// Baholash mezonini faqat administrator boshqaradi
router.use(authenticate, allowRoles('admin'));

router.get('/', ctrl.list);
router.get('/:subjectId', validate(subjectIdParam, 'params'), ctrl.getOne);
router.put('/:subjectId', validate(subjectIdParam, 'params'), validate(gradingSchemeSchema), ctrl.save);
router.post('/:subjectId/publish', validate(subjectIdParam, 'params'), ctrl.publish);
router.post('/:subjectId/unpublish', validate(subjectIdParam, 'params'), ctrl.unpublish);
router.delete('/:subjectId', validate(subjectIdParam, 'params'), ctrl.remove);

export default router;
