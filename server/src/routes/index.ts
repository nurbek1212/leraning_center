import { Router } from 'express';
import attendance from './attendance';
import auth from './auth';
import dashboard from './dashboard';
import grades from './grades';
import grading from './grading';
import groups from './groups';
import payments from './payments';
import students from './students';
import subjects from './subjects';
import teachers from './teachers';

const router = Router();

router.use('/auth', auth);
router.use('/subjects', subjects);
router.use('/teachers', teachers);
router.use('/students', students);
router.use('/groups', groups);
router.use('/grading-schemes', grading);
router.use('/grades', grades);
router.use('/attendance', attendance);
router.use('/payments', payments);
router.use('/dashboard', dashboard);

export default router;
