import { config } from 'dotenv';
config();

export const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/node-crud';
export const PORT = process.env.PORT || 5000;
export const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret';
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
export const CORS_OPTIONS = { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true };
export const DEFAULT_PERMISSIONS = [
  { method: 'POST', path: '/todo', isEnabled: true, scope: 'own' },
  { method: 'GET', path: '/todo/list', isEnabled: true, scope: 'own' },
  { method: 'GET', path: '/todo/:id', isEnabled: true, scope: 'own' },
  { method: 'PATCH', path: '/todo/:id', isEnabled: true, scope: 'own' },
  { method: 'DELETE', path: '/todo/:id', isEnabled: true, scope: 'own' },

  { method: 'GET', path: '/permissions/list', isEnabled: false, scope: 'all' },
  { method: 'PATCH', path: '/permissions/user/:id', isEnabled: false, scope: 'all' },
  { method: 'PATCH', path: '/permissions/role/:roleName', isEnabled: false, scope: 'all' },
];
