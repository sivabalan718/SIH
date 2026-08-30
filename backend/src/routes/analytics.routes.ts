import { Router } from 'express';
import { handleGetArtisanAnalytics } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const analyticsRouter = Router();

// GET /api/v1/analytics/artisan - Strictly isolated to authenticated artisan
analyticsRouter.get('/artisan', requireAuth, handleGetArtisanAnalytics);
