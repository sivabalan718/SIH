import { Request, Response } from 'express';
import {
  checkReviewEligibility,
  submitProductReview,
  getProductReviewStats,
  getArtisanProductFeedback,
} from '../services/review.service.js';
import { generateFeedbackInsight } from '../services/ai/feedback-intelligence.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function getUserId(req: Request): string {
  const user = (req as any).user;
  const artisan = (req as any).artisan;
  const customer = (req as any).customer;
  return customer?.id || user?.id || artisan?.id || (req.headers['x-guest-buyer-id'] as string) || 'guest-user';
}

function getArtisanId(req: Request): string {
  const artisan = (req as any).artisan;
  const user = (req as any).user;
  return artisan?.id || user?.id || 'all';
}

/**
 * Check if current user is eligible to submit a review for a product or order item
 */
export async function handleCheckReviewEligibility(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getUserId(req);
    const productId = req.params.productId;
    const orderItemId = req.query.order_item_id as string | undefined;

    if (!productId) {
      sendError(res, 'VALIDATION_ERROR', 'Product ID is required.', 400);
      return;
    }

    const result = await checkReviewEligibility(buyerId, productId, orderItemId);
    sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'ELIGIBILITY_CHECK_FAILED', error.message || 'Unable to check review eligibility.', statusCode);
  }
}

/**
 * Submit verified product review for an order item
 */
export async function handleSubmitReview(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getUserId(req);
    const { order_item_id, rating, review_text } = req.body;

    if (!order_item_id) {
      sendError(res, 'VALIDATION_ERROR', 'Order item ID is required.', 400);
      return;
    }

    if (!rating || typeof rating !== 'number') {
      sendError(res, 'VALIDATION_ERROR', 'A numerical rating between 1 and 5 is required.', 400);
      return;
    }

    const result = await submitProductReview(buyerId, {
      order_item_id,
      rating,
      review_text,
    });

    sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'REVIEW_SUBMISSION_FAILED', error.message || 'Unable to submit review.', statusCode);
  }
}

/**
 * Public endpoint to fetch rating summary & reviews for a product page
 */
export async function handleGetPublicProductReviews(req: Request, res: Response): Promise<void> {
  try {
    const productId = req.params.productId;
    if (!productId) {
      sendError(res, 'VALIDATION_ERROR', 'Product ID is required.', 400);
      return;
    }

    const stats = await getProductReviewStats(productId);
    sendSuccess(res, stats);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'FETCH_REVIEWS_FAILED', error.message || 'Unable to fetch product reviews.', statusCode);
  }
}

/**
 * Artisan workspace endpoint: fetch feedback breakdown for owned product
 */
export async function handleGetArtisanProductFeedback(req: Request, res: Response): Promise<void> {
  try {
    const artisanId = getArtisanId(req);
    const productId = req.params.productId;

    if (!productId) {
      sendError(res, 'VALIDATION_ERROR', 'Product ID is required.', 400);
      return;
    }

    const feedback = await getArtisanProductFeedback(artisanId, productId);
    sendSuccess(res, feedback);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'ARTISAN_FEEDBACK_FAILED', error.message || 'Unable to fetch artisan product feedback.', statusCode);
  }
}

/**
 * Artisan workspace endpoint: generate evidence-grounded AI feedback insight
 */
export async function handleGetArtisanFeedbackInsight(req: Request, res: Response): Promise<void> {
  try {
    const artisanId = getArtisanId(req);
    const productId = req.params.productId;
    const lang = (req.query.lang as 'en' | 'ta' | 'hi') || 'en';

    if (!productId) {
      sendError(res, 'VALIDATION_ERROR', 'Product ID is required.', 400);
      return;
    }

    const feedback = await getArtisanProductFeedback(artisanId, productId);
    const insight = await generateFeedbackInsight(feedback.stats, lang);

    sendSuccess(res, {
      product_id: productId,
      product_name: feedback.product_name,
      insight,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'FEEDBACK_INSIGHT_FAILED', error.message || 'Unable to generate feedback insight.', statusCode);
  }
}
