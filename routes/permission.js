import { Router } from 'express';
import { list, update, role } from '../controllers/permission.js';

const permission = Router();

permission.get('/list', list);
permission.patch('/user/:id', update);
permission.patch('/role/:roleName', role);

export default permission;
