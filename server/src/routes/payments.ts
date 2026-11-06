import { Router } from 'express';
import * as ctrl from '../controllers/paymentController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';
import { validate } from '../middlewares/validate';
import { checkoutSchema, idParam, paymentCreateSchema, paymentListQuery, periodQuery } from '../validators';

const router = Router();

router.use(authenticate);

// Talaba
router.get('/my', allowRoles('student'), validate(periodQuery, 'query'), ctrl.myPayments);
router.post('/checkout', allowRoles('student'), validate(checkoutSchema), ctrl.checkout);

// Admin
router.get('/debts', allowRoles('admin'), validate(periodQuery, 'query'), ctrl.debts);
router.get('/', allowRoles('admin'), validate(paymentListQuery, 'query'), ctrl.list);
router.post('/', allowRoles('admin'), validate(paymentCreateSchema), ctrl.create);
router.post('/:id/cancel', allowRoles('admin'), validate(idParam, 'params'), ctrl.cancel);

export default router;
