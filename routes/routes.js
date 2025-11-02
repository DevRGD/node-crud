import todo from './todo.js';
import auth from './auth.js';
import { Router } from 'express';
import permission from './permission.js';
import protect from '../middleware/protect.js';

const router = Router();

router.get('/', (req, res) => res.send('ok'));
router.use('/auth', auth);
router.use(protect);
router.use('/todo', todo);
router.use('/permissions', permission);

export default router;
