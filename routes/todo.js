import { Router } from 'express';
import { list, details, create, update, remove } from '../controllers/todo.js';

const todo = Router();

todo.get('/list', list);
todo.get('/:id', details);
todo.post('/', create);
todo.patch('/:id', update);
todo.delete('/:id', remove);

export default todo;
