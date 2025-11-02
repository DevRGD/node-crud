import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import express, { json } from 'express';
import router from './routes/routes.js';
import cookieParser from 'cookie-parser';
import { CORS_OPTIONS, DB_URL, PORT } from './configs/env.js';

const app = express();

app.use(cors(CORS_OPTIONS));
app.use(json());
app.use(cookieParser());
app.use('/public/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use(router);

mongoose
  .connect(DB_URL)
  .then(() => {
    const server = app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    server.on('error', (err) => console.error('Server error:', err));
  })
  .catch((err) => console.error('Database connection error:', err));
