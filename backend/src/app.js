import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { basePrisma } from './middleware/tenant.middleware.js';

import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import userRoutes from './routes/user.routes.js';
import objectiveRoutes from './routes/objective.routes.js';
import elementRoutes from './routes/element.routes.js';
import accomplishmentRoutes from './routes/accomplishment.routes.js';
import reportRoutes from './routes/report.routes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  try {
    await basePrisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/elements', elementRoutes);
app.use('/api/accomplishments', accomplishmentRoutes);
app.use('/api/reports', reportRoutes);

// Global error handler
app.use((err, req, res, _next) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
  }
  if (err.status) {
    // Log 4xx errors from upstream services (AI proxy, etc.) so they're visible in pod logs
    if (err.status >= 400 && err.status < 500) {
      console.error(`[${err.status}] ${err.message}`, err.error ?? '');
    }
    return res.status(err.status).json({ error: err.message, code: err.code || 'ERROR' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Reflections backend running on port ${PORT}`);
  console.log(`Auth mode: ${process.env.OAUTH2_CLIENT_ID ? 'oidc' : 'local'}`);
});

export default app;
