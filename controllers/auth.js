import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { REFRESH_TOKEN_SECRET, NODE_ENV } from '../configs/env.js';
import { sendTokenResponse } from '../utils/token.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(403).json({ success: false, message: 'Not authorized, no refresh token' });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    return res.status(403).json({ success: false, message: 'Not authorized, refresh token failed' });
  }
};

export const logout = async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'Strict',
    expires: new Date(0),
  };

  res.cookie('accessToken', '', {
    ...cookieOptions,
    path: '/',
  });

  res.cookie('refreshToken', '', {
    ...cookieOptions,
    path: '/auth',
  });

  res.status(200).json({ success: true, data: {} });
};
