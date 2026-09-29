import { Router } from 'express';
import {
  handleCheckReviewEligibility,
  handleSubmitReview,
  handleGetPublicProductReviews,
  handleGetArtisanProductFeedback,
  handleGetArtisanFeedbackInsight,
} from '../controllers/review.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

export const reviewRouter = Router();

// Customer review routes
reviewRouter.post('/reviews', optionalAuth, handleSubmitReview);
reviewRouter.get('/reviews/eligibility/:productId', optionalAuth, handleCheckReviewEligibility);

// Public marketplace review route
reviewRouter.get('/products/:productId/reviews', handleGetPublicProductReviews);

// Artisan feedback & AI insight routes
reviewRouter.get('/artisan/products/:productId/feedback', requireAuth, handleGetArtisanProductFeedback);
reviewRouter.get('/artisan/products/:productId/feedback-insight', requireAuth, handleGetArtisanFeedbackInsight);
