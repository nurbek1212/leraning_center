import { Router } from 'express';
import * as ctrl from '../controllers/groupController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { groupSchema, groupStudentParams, idParam, listQuery } from '../validators';

const router = Router();

router.use(authenticate);

// Ustoz o'z guruhlari (":id" yo'llaridan OLDIN turishi shart)
router.get('/my', allowRoles('teacher'), ctrl.myGroups);

// Admin hamma guruhni, ustoz faqat o'z guruhini ko'radi (controller ichida tekshiriladi)
router.get('/:id/students', allowRoles('admin', 'teacher'), validate(idParam, 'params'), ctrl.groupStudents);
router.get(
  '/:id/students/:studentId',
  allowRoles('admin', 'teacher'),
  validate(groupStudentParams, 'params'),
  ctrl.studentDetail
);

// CRUD faqat admin uchun
router.get('/', allowRoles('admin'), validate(listQuery, 'query'), ctrl.list);
router.get('/:id', allowRoles('admin'), validate(idParam, 'params'), ctrl.getOne);
router.post('/', allowRoles('admin'), validate(groupSchema), ctrl.create);
router.put('/:id', allowRoles('admin'), validate(idParam, 'params'), validate(groupSchema), ctrl.update);
router.delete('/:id', allowRoles('admin'), validate(idParam, 'params'), ctrl.remove);

export default router;
