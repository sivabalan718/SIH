import { Request, Response } from 'express';
import { getArtisanAnalytics, TimePeriod } from '../services/analytics.service.js';
import { generateBusinessInsights } from '../services/ai/business-intelligence.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function handleGetArtisanAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const artisan = (req as any).artisan;
    const user = (req as any).user;
    const artisanId = artisan?.id || user?.id;

    if (!artisanId) {
      sendError(res, 'UNAUTHORIZED', 'Artisan authentication required.', 401);
      return;
    }

    const { period, lang } = req.query;
    const validPeriod: TimePeriod = ['7d', '30d', '90d', 'this_year', 'all_time'].includes(String(period))
      ? (String(period) as TimePeriod)
      : '30d';

    const validLang: 'en' | 'ta' | 'hi' = ['en', 'ta', 'hi'].includes(String(lang))
      ? (String(lang) as 'en' | 'ta' | 'hi')
      : 'en';

    // 1. Calculate Deterministic Business Analytics
    const analytics = await getArtisanAnalytics(artisanId, validPeriod);

    // 2. Generate Explainable Business Intelligence Insights
    const insights = await generateBusinessInsights(analytics, validLang);

    sendSuccess(res, {
      analytics,
      insights,
    });
  } catch (error: any) {
    logger.error('handleGetArtisanAnalytics failed:', error);
    sendError(res, 'ANALYTICS_ERROR', error.message || 'Failed to calculate analytics.', 500);
  }
}
