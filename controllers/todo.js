import fs from 'fs';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import Todo from '../models/Todo.js';
import { BASE_URL } from '../configs/env.js';

export const list = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc', status } = req.query;
    const pageNumber = Math.max(parseInt(page), 1);
    const limitNumber = Math.max(parseInt(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;
    const sortOrder = order === 'asc' ? 1 : -1;
    const allowedSortFields = ['createdAt', 'title', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    // Only find todos belonging to the logged-in user
    const query = {
      user: req.user._id,
    };

    if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
      query.status = status;
    }

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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Todo ID' });
    }

    // Find by ID and ensure it belongs to the user
    const foundTodo = await Todo.findOne({ _id: id, user: req.user._id });

    if (!foundTodo) {
      // Return 404, not 403. The user should not know if the resource exists.
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    res.status(200).json({ success: true, data: foundTodo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const create = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const todoData = { title: title.trim(), description: description?.trim() };

    if (file) {
      const fileUrl = `${BASE_URL}/uploads/${file.filename}`;
      todoData.file = {
        url: fileUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    const newTodo = await Todo.create(todoData);
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
    const file = req.file;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Todo ID' });
    }

    // Find by ID and ensure it belongs to the user
    const todo = await Todo.findOne({ _id: id, user: req.user._id });

    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    if (title !== undefined) todo.title = title.trim();
    if (description !== undefined) todo.description = description.trim();
    if (status && ['pending', 'in-progress', 'completed'].includes(status)) todo.status = status;

    if (file) {
      if (todo.file?.url) {
        const oldFilename = path.basename(todo.file.url);
        const oldFilePath = path.join(process.cwd(), 'uploads', oldFilename);
        fs.unlink(oldFilePath, (err) => {
          if (err) console.warn('Failed to delete old file:', err);
        });
      }

      const fileUrl = `${BASE_URL}/uploads/${file.filename}`;
      todo.file = {
        url: fileUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
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
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Todo ID' });
    }

    // Find by ID and ensure it belongs to the user
    const todo = await Todo.findOne({ _id: id, user: req.user._id });

    if (!todo) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    if (todo.file?.url) {
      const filename = path.basename(todo.file.url);
      const filePath = path.join(process.cwd(), 'uploads', filename);

      fs.unlink(filePath, (err) => {
        if (err) console.warn('Failed to delete file:', err);
      });
    }

    await todo.deleteOne();
    res.status(200).json({ success: true, message: 'Todo and associated file deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
