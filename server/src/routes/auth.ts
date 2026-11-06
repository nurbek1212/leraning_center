import { Router } from 'express';
import * as ctrl from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { loginSchema } from '../validators';

const router = Router();

router.post('/login', validate(loginSchema), ctrl.login);
router.get('/me', authenticate, ctrl.me);

export default router;
