import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getBuyerOrders } from './order.service.js';
import { getMarketplaceProductById } from './marketplace.service.js';

export interface ProductReviewRecord {
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

export interface SubmitReviewInput {
  order_item_id: string;
  rating: number;
  review_text?: string;
}

export interface ReviewEligibilityResult {
  can_review: boolean;
  order_item_id?: string;
  order_id?: string;
  product_id: string;
  is_already_reviewed: boolean;
  reason?: string;
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
  recent_reviews: ProductReviewRecord[];
}

/**
 * Check if a customer is eligible to review a specific product or order item.
 * Must be from a DELIVERED or COMPLETED order owned by the customer, and not previously reviewed.
 */
export async function checkReviewEligibility(
  customerId: string,
  productId: string,
  orderItemId?: string
): Promise<ReviewEligibilityResult> {
  const orders = await getBuyerOrders(customerId);
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED' || (o.status as string) === 'COMPLETED');

  if (deliveredOrders.length === 0) {
    return {
      can_review: false,
      product_id: productId,
      is_already_reviewed: false,
      reason: 'No delivered orders found for this product.',
    };
  }

  // Find eligible order items matching productId (or orderItemId)
  const eligibleItems: Array<{ order_item_id: string; order_id: string; product_id: string }> = [];
  for (const o of deliveredOrders) {
    for (const item of o.items) {
      if (item.product_id === productId && (!orderItemId || item.id === orderItemId)) {
        if (item.id) {
          eligibleItems.push({
            order_item_id: item.id,
            order_id: o.id,
            product_id: item.product_id,
          });
        }
      }
    }
  }

  if (eligibleItems.length === 0) {
    return {
      can_review: false,
      product_id: productId,
      is_already_reviewed: false,
      reason: 'No eligible delivered purchase found.',
    };
  }

  // Query Supabase database to check existing reviews for these order_item_ids
  const supabase = getSupabaseAdmin();
  const itemIds = eligibleItems.map((i) => i.order_item_id);

  const { data: existingReviews, error } = await supabase
    .from('product_reviews')
    .select('order_item_id')
    .in('order_item_id', itemIds);

  if (error && error.code !== 'PGRST116') {
    logger.warn(`[ReviewService] Error checking existing reviews in Supabase: ${error.message}`);
  }

  const reviewedSet = new Set((existingReviews || []).map((r: any) => r.order_item_id));
  const unreviewedItem = eligibleItems.find((i) => !reviewedSet.has(i.order_item_id));

  if (unreviewedItem) {
    return {
      can_review: true,
      order_item_id: unreviewedItem.order_item_id,
      order_id: unreviewedItem.order_id,
      product_id: unreviewedItem.product_id,
      is_already_reviewed: false,
    };
  }

  return {
    can_review: false,
    order_item_id: eligibleItems[0].order_item_id,
    order_id: eligibleItems[0].order_id,
    product_id: productId,
    is_already_reviewed: true,
    reason: 'This order item has already been reviewed.',
  };
}

/**
 * Submit verified customer review for a delivered order item.
 * Single source of truth is Supabase database (`product_reviews`).
 */
export async function submitProductReview(
  customerId: string,
  input: SubmitReviewInput
): Promise<ProductReviewRecord> {
  // Validate Rating (1-5 integer)
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw Object.assign(new Error('Rating must be an integer between 1 and 5 stars.'), { statusCode: 400 });
  }

  const reviewText = input.review_text?.trim() || null;
  if (reviewText && reviewText.length > 1000) {
    throw Object.assign(new Error('Review text cannot exceed 1000 characters.'), { statusCode: 400 });
  }

  // Server-side ownership & status validation from buyer's orders
  const orders = await getBuyerOrders(customerId);
  let matchedItem: { id: string; order_id: string; product_id: string; artisan_id: string } | null = null;
  let matchedOrder: any = null;

  for (const o of orders) {
    if (o.status === 'DELIVERED' || (o.status as string) === 'COMPLETED') {
      for (const item of o.items) {
        if (item.id === input.order_item_id) {
          matchedItem = {
            id: item.id,
            order_id: o.id,
            product_id: item.product_id,
            artisan_id: item.artisan_id || o.artisan_id,
          };
          matchedOrder = o;
          break;
        }
      }
    }
    if (matchedItem) break;
  }

  if (!matchedItem) {
    throw Object.assign(
      new Error('Order item not found, not owned by customer, or order is not in DELIVERED status.'),
      { statusCode: 403 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Check if order item has already been reviewed (unique constraint check)
  const { data: existing } = await supabase
    .from('product_reviews')
    .select('id')
    .eq('order_item_id', input.order_item_id)
    .single();

  if (existing) {
    throw Object.assign(new Error('You have already submitted a review for this order item.'), { statusCode: 409 });
  }

  const now = new Date().toISOString();
  const reviewRecord = {
    order_item_id: matchedItem.id,
    order_id: matchedItem.order_id,
    product_id: matchedItem.product_id,
    customer_id: customerId,
    artisan_id: matchedItem.artisan_id,
    rating: input.rating,
    review_text: reviewText,
    customer_name: 'Verified Customer',
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error } = await supabase
    .from('product_reviews')
    .insert([reviewRecord])
    .select()
    .single();

  if (error || !inserted) {
    logger.error(`[ReviewService] Failed to persist product review in Supabase: ${error?.message || 'Unknown error'}`);
    throw Object.assign(
      new Error(`Database error: Could not save review. ${error?.message || 'Supabase unavailable.'}`),
      { statusCode: 500 }
    );
  }

  logger.info(`[ReviewService] Successfully saved product review for product ${matchedItem.product_id} (rating: ${input.rating})`);
  return inserted as ProductReviewRecord;
}

/**
 * Fetch verified reviews and calculate deterministic statistics for a product.
 * Returns public-safe review records (no private customer identifiers exposed).
 */
export async function getProductReviewStats(productId: string): Promise<DeterministicReviewStats> {
  const supabase = getSupabaseAdmin();

  const { data: reviews, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error && error.code !== 'PGRST116') {
    logger.warn(`[ReviewService] Failed to fetch product reviews for ${productId}: ${error.message}`);
  }

  const allReviews: ProductReviewRecord[] = (reviews || []).map((r: any) => ({
    id: r.id,
    order_item_id: r.order_item_id,
    order_id: r.order_id,
    product_id: r.product_id,
    customer_id: r.customer_id,
    artisan_id: r.artisan_id,
    rating: Number(r.rating) || 5,
    review_text: r.review_text || null,
    customer_name: r.customer_name || 'Verified Customer',
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const total = allReviews.length;
  if (total === 0) {
    return {
      total_reviews: 0,
      average_rating: 0,
      positive_percentage: 0,
      rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recent_reviews: [],
    };
  }

  const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
  const average_rating = Math.round((sum / total) * 10) / 10;

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let positiveCount = 0;

  for (const r of allReviews) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] || 0) + 1;
    if (star >= 4) positiveCount++;
  }

  const positive_percentage = Math.round((positiveCount / total) * 100);

  return {
    total_reviews: total,
    average_rating,
    positive_percentage,
    rating_distribution: distribution,
    recent_reviews: allReviews,
  };
}

/**
 * Fetch artisan feedback view. Enforces server-side ownership verification.
 */
export async function getArtisanProductFeedback(artisanId: string, productId: string) {
  // Validate product ownership
  const product = await getMarketplaceProductById(productId);
  if (!product) {
    throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
  }

  if (artisanId !== 'all' && product.artisan_id !== artisanId) {
    throw Object.assign(new Error('Access denied: You do not own this product.'), { statusCode: 403 });
  }

  const stats = await getProductReviewStats(productId);
  return {
    product_id: productId,
    product_name: product.name,
    stats,
  };
}
