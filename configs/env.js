import { config } from 'dotenv';
config();

export const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/node-crud';
export const PORT = process.env.PORT || 5000;
export const BASE_URL = process.env.URL?.replace(/\/$/, '') || 'http://localhost:8080';
