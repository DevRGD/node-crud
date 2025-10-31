import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    file: {
      url: { type: String, trim: true },
      originalName: { type: String, trim: true },
      mimeType: { type: String, trim: true },
      size: { type: Number },
    },
  },
  { timestamps: true },
);

const Todo = model('todos', schema);

export default Todo;
