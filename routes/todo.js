import { Router } from 'express';
import { upload } from '../utils/multer.js';
import { list, details, create, update, remove } from '../controllers/todo.js';

const todo = Router();

todo.get('/list', list);
todo.get('/:id', details);
todo.post('/', upload.single('file'), create);
todo.patch('/:id', upload.single('file'), update);
todo.delete('/:id', remove);

export default todo;
