import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  },
  { timestamps: true },
);

const Todo = model('todos', schema);

export default Todo;
