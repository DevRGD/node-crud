import cors from 'cors';
import mongoose from 'mongoose';
import express, { json } from 'express';
import router from './routes/routes.js';
import { DB_URL, PORT } from './configs/env.js';

const app = express();
app.use(cors());
app.use(json());
app.use(router);

mongoose
  .connect(DB_URL)
  .then(app.listen(PORT, () => console.log(`http://localhost:${PORT}`)))
  .catch((err) => console.log(err));
