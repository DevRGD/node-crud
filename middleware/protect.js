import jwt from 'jsonwebtoken';
import { match } from 'path-to-regexp';
import User from '../models/User.js';
import Permission from '../models/Permission.js';
import { ACCESS_TOKEN_SECRET } from '../configs/env.js';

export default async function protect(req, res, next) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    const Permissions = await Permission.findOne({ user: req.user._id });

    if (!Permissions) {
      return res.status(403).json({ success: false, message: 'Forbidden: Permissions not configured for this user.' });
    }

    if (Permissions.role === 'superadmin') {
      req.user.scope = 'all';
      return next();
    }

    const requestMethod = req.method;
    const routePath = req.path;
    const { permissions } = Permissions;

    let isAuthorized = false;
    let matchingPermission = null;

    for (const permission of permissions) {
      const matchFn = match(permission.path, { decode: decodeURIComponent });
      const pathMatch = matchFn(routePath);
      const methodMatch = permission.method === 'ALL' || permission.method === requestMethod;

      if (pathMatch && methodMatch) {
        if (permission.isEnabled) {
          isAuthorized = true;
          matchingPermission = permission;
        } else {
          isAuthorized = false;
        }
        break;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission for ${requestMethod} ${routePath}.`,
      });
    }

    req.user.scope = matchingPermission.scope;
    next();
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}
