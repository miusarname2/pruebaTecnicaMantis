import express from 'express';
import cors from 'cors';
import authMiddleware from './middlewares/auth.js';
import errorHandler from './middlewares/errorHandler.js';
import projectRoutes from './routes/projectRoutes.js';
import issueRoutes from './routes/issueRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', authMiddleware);

app.use('/api/projects', projectRoutes);
app.use('/api/projects', issueRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use(errorHandler);

export default app;
