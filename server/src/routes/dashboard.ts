import { Router } from 'express';
import * as ctrl from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';
import { allowRoles } from '../middlewares/role';

const router = Router();

router.get('/', authenticate, allowRoles('admin'), ctrl.stats);

export default router;
