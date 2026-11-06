import { Router } from 'express';
import * as ctrl from '../controllers/studentController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { idParam, studentCreateSchema, studentListQuery, studentUpdateSchema } from '../validators';

const router = Router();

router.use(authenticate);

// Talaba o'z ma'lumotlari (":id" yo'llaridan OLDIN turishi shart)
router.get('/me/grades', allowRoles('student'), ctrl.myGrades);
router.get('/me/attendance', allowRoles('student'), ctrl.myAttendance);

// Qolgani faqat admin uchun
router.use(allowRoles('admin'));
router.get('/', validate(studentListQuery, 'query'), ctrl.list);
router.get('/:id', validate(idParam, 'params'), ctrl.getOne);
router.post('/', validate(studentCreateSchema), ctrl.create);
router.put('/:id', validate(idParam, 'params'), validate(studentUpdateSchema), ctrl.update);
router.delete('/:id', validate(idParam, 'params'), ctrl.remove);

export default router;
