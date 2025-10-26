import Todo from '../models/Todo.js';

export const list = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', status } = req.query;
    const pageNumber = Math.max(parseInt(page), 1);
    const limitNumber = Math.max(parseInt(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;
    const sortOrder = order === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'title', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const query = {};
    if (status && ['pending', 'in-progress', 'completed'].includes(status)) query.status = status;

    const total = await Todo.countDocuments(query);
    const todos = await Todo.find(query)
      .skip(skip)
      .limit(limitNumber)
      .sort({ [sortField]: sortOrder });

    res.status(200).json({
      success: true,
      count: todos.length,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      total,
      data: todos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const details = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid Todo ID' });
    }

    const foundTodo = await Todo.findById(id);

    if (!foundTodo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    res.status(200).json({
      success: true,
      data: foundTodo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const create = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const newTodo = await Todo.create({ title: title.trim(), description: description?.trim() });
    res.status(201).json({ success: true, data: newTodo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid Todo ID' });
    }

    const todo = await Todo.findById(id);
    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    if (title !== undefined) todo.title = title.trim();
    if (description !== undefined) todo.description = description.trim();
    if (status !== undefined && ['pending', 'in-progress', 'completed'].includes(status)) {
      todo.status = status;
    }

    await todo.save();
    res.status(200).json({ success: true, data: todo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid Todo ID' });
    }

    const todo = await Todo.findById(id);
    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    await todo.deleteOne();
    res.status(200).json({ success: true, message: 'Todo deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
