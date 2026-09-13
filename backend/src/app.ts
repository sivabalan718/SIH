import '@imgly/background-removal-node';
import sharp from 'sharp';
sharp.cache(false);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { sendError } from './utils/response.js';
import { logger } from './utils/logger.js';

export const app = express();

// Security & Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'M63 Backend API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', routes);
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  return sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
});

// Centralized Error Handler
app.use(errorHandler);

// Start server if main module
if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () => {
    logger.info(`M63 Backend API server running on port ${env.port} (${env.nodeEnv})`);
  });
}
