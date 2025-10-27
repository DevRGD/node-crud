import cors from 'cors';
import mongoose from 'mongoose';
import express, { json } from 'express';
import path from 'path';
import router from './routes/routes.js';
import { DB_URL, PORT } from './configs/env.js';

const app = express();

app.use(cors());
app.use(json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(router);

mongoose
  .connect(DB_URL)
  .then(() => {
    const server = app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    server.on('error', (err) => console.error('Server error:', err));
  })
  .catch((err) => console.error('Database connection error:', err));
