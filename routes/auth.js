import { Router } from 'express';
import protect from '../middleware/protect.js';
import { register, login, refresh, logout } from '../controllers/auth.js';

const auth = Router();

auth.post('/register', register);
auth.post('/login', login);
auth.post('/refresh', refresh);
auth.post('/logout', protect, logout);

export default auth;
