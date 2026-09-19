import { apiRequest } from './api.js';

export interface ProductReviewItem {
  id: string;
  order_item_id: string;
  order_id: string;
  product_id: string;
  customer_id: string;
  artisan_id: string;
  rating: number;
  review_text: string | null;
  customer_name: string;
  created_at: string;
  updated_at: string;
}

export interface DeterministicReviewStats {
  total_reviews: number;
  average_rating: number;
  positive_percentage: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recent_reviews: ProductReviewItem[];
}

export interface ReviewEligibilityResult {
  can_review: boolean;
  order_item_id?: string;
  order_id?: string;
  product_id: string;
  is_already_reviewed: boolean;
  reason?: string;
}

export interface FeedbackInsight {
  summary: string;
  positive_themes: string[];
  improvement_themes: string[];
  evidence_count: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  limitations: string[];
}

export interface ArtisanFeedbackResponse {
  product_id: string;
  product_name: string;
  stats: DeterministicReviewStats;
}

export interface ArtisanInsightResponse {
  product_id: string;
  product_name: string;
  insight: FeedbackInsight;
}

/**
 * Submit verified customer review for a delivered order item
 */
export async function submitReview(input: {
  order_item_id: string;
  rating: number;
  review_text?: string;
}): Promise<ProductReviewItem> {
  const result = await apiRequest<{ data: ProductReviewItem }>('/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.data;
}

/**
 * Check if current buyer can review a product / order item
 */
export async function checkReviewEligibility(
  productId: string,
  orderItemId?: string
): Promise<ReviewEligibilityResult> {
  const query = orderItemId ? `?order_item_id=${encodeURIComponent(orderItemId)}` : '';
  const result = await apiRequest<{ data: ReviewEligibilityResult }>(
    `/reviews/eligibility/${productId}${query}`,
    { method: 'GET' }
  );
  return result.data;
}

/**
 * Get public ratings & verified reviews for a marketplace product
 */
export async function getProductReviews(productId: string): Promise<DeterministicReviewStats> {
  const result = await apiRequest<{ data: DeterministicReviewStats }>(
    `/products/${productId}/reviews`,
    { method: 'GET' }
  );
  return result.data;
}

/**
 * Get artisan product feedback analytics
 */
export async function getArtisanFeedback(productId: string): Promise<ArtisanFeedbackResponse> {
  const result = await apiRequest<{ data: ArtisanFeedbackResponse }>(
    `/artisan/products/${productId}/feedback`,
    { method: 'GET' }
  );
  return result.data;
}

/**
 * Get evidence-grounded AI feedback insight for artisan product
 */
export async function getArtisanFeedbackInsight(
  productId: string,
  lang: string = 'en'
): Promise<ArtisanInsightResponse> {
  const result = await apiRequest<{ data: ArtisanInsightResponse }>(
    `/artisan/products/${productId}/feedback-insight?lang=${lang}`,
    { method: 'GET' }
  );
  return result.data;
}
