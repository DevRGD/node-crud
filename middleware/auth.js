import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ACCESS_TOKEN_SECRET } from '../configs/env.js';

export default async function protect(req, res, next) {
  let token;

  if (req.cookies.accessToken) token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized, user not found' });

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
}
