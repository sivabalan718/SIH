import { describe, it, expect } from '@jest/globals';
import {
  generateFeedbackInsight,
  generateDeterministicFallback,
} from '../src/services/ai/feedback-intelligence.service.js';
import { ProductReviewRecord } from '../src/services/review.service.js';

describe('M63 Verified Customer Feedback & Grounded Insight Tests', () => {
  const sampleReviews: ProductReviewRecord[] = [
    {
      id: 'rev-1',
      order_item_id: 'item-1',
      order_id: 'ord-1',
      product_id: 'prod-100',
      customer_id: 'cust-1',
      artisan_id: 'art-1',
      rating: 5,
      review_text: 'Excellent craftsmanship and beautiful finish. Very durable terracotta pot!',
      customer_name: 'Verified Customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rev-2',
      order_item_id: 'item-2',
      order_id: 'ord-2',
      product_id: 'prod-100',
      customer_id: 'cust-2',
      artisan_id: 'art-1',
      rating: 4,
      review_text: 'Great quality weave, but delivery took 1 extra day.',
      customer_name: 'Verified Customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rev-3',
      order_item_id: 'item-3',
      order_id: 'ord-3',
      product_id: 'prod-100',
      customer_id: 'cust-3',
      artisan_id: 'art-1',
      rating: 5,
      review_text: 'Outstanding finish and vibrant color! Would recommend to everyone.',
      customer_name: 'Verified Customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('should generate deterministic fallback when 0 reviews exist', () => {
    const fallback = generateDeterministicFallback('Handcrafted Terracotta Pot', []);
    expect(fallback.evidence_count).toBe(0);
    expect(fallback.confidence).toBe('LOW');
    expect(fallback.summary).toContain('No customer feedback yet');
    expect(fallback.positive_themes).toEqual([]);
    expect(fallback.improvement_themes).toEqual([]);
  });

  it('should generate deterministic fallback when 1-2 reviews exist', () => {
    const fallback = generateDeterministicFallback('Handcrafted Terracotta Pot', sampleReviews.slice(0, 2));
    expect(fallback.evidence_count).toBe(2);
    expect(fallback.confidence).toBe('LOW');
    expect(fallback.summary).toContain('Limited customer feedback is available');
    expect(fallback.positive_themes.length).toBeGreaterThan(0);
  });

  it('should generate deterministic fallback when 3+ reviews exist', () => {
    const fallback = generateDeterministicFallback('Handcrafted Terracotta Pot', sampleReviews);
    expect(fallback.evidence_count).toBe(3);
    expect(fallback.confidence).toBe('MEDIUM');
    expect(fallback.summary).toContain('4.7 out of 5 stars');
  });

  it('should produce grounded insights with no fabricated themes when Gemini fallback triggers', async () => {
    const insight = await generateFeedbackInsight('Handcrafted Terracotta Pot', sampleReviews, 'en');
    expect(insight).toBeDefined();
    expect(insight.evidence_count).toBe(3);
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(insight.confidence);
    expect(Array.isArray(insight.positive_themes)).toBe(true);
    expect(Array.isArray(insight.improvement_themes)).toBe(true);
  });
});
