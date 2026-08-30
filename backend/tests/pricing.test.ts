import { describe, it, expect } from '@jest/globals';
import {
  generateFairPriceRecommendation,
  extractPricingFromVoice,
} from '../src/services/ai/pricing-intelligence.service.js';
import {
  savePricingRecord,
  getPricingRecord,
} from '../src/services/pricing.service.js';

describe('Smart Fair Pricing Intelligence Unit Tests', () => {
  it('should calculate known production cost deterministically and build evidence package', async () => {
    const input = {
      name: 'Handwoven Silk Saree',
      category: 'Apparel & Textiles',
      material: 'Pure Mulberry Silk',
      existing_price: 1200,
      material_cost: 1500,
      labour_cost: 1000,
      other_expenses: 500,
      production_time: 5,
      production_time_unit: 'days' as const,
    };

    const rec = await generateFairPriceRecommendation(input, 'en');

    expect(rec.known_cost).toBe(3000);
    expect(rec.fair_price_min).toBeGreaterThanOrEqual(3000);
    expect(rec.fair_price_max).toBeGreaterThan(rec.fair_price_min!);
    expect(rec.suggested_price).toBeGreaterThanOrEqual(rec.fair_price_min!);
    expect(rec.suggested_price).toBeLessThanOrEqual(rec.fair_price_max!);
    expect(rec.price_justification || (rec as any).explanation).toBeTruthy();

    // Verify Evidence & Trust Level Matrix
    expect(rec.data_availability).toBeDefined();
    expect(rec.data_availability['Production Cost']).toContain('Verified');

    // Verify Artisan Price Comparison
    expect(rec.comparison_with_artisan_price).toBeDefined();
    expect(rec.comparison_with_artisan_price.artisan_price).toBe(1200);
    expect(rec.comparison_with_artisan_price.position_status).toBe('below');

    // Verify 5-step Reasoning Flow
    expect(rec.reasoning_flow.length).toBe(5);
    expect(rec.reasoning_flow[0].title).toBe('Production Economics');
  }, 30000);

  it('should flag ambiguous single-number speech without guessing field', async () => {
    const result = await extractPricingFromVoice(
      Buffer.from('500'),
      'audio/webm',
      'en',
      '500'
    );

    expect(result.needs_clarification).toBe(true);
    expect(result.ambiguous_fields.length).toBeGreaterThan(0);
    expect(result.ambiguous_fields[0].value).toBe(500);
    expect(result.extracted.material_cost).toBeNull();
  }, 30000);

  it('should enforce data isolation between product IDs and artisans', async () => {
    const prodA = 'prod-111-aaa';
    const prodB = 'prod-222-bbb';
    const artisanId = 'artisan-owner-999';

    await savePricingRecord(prodA, artisanId, {
      material_cost: 800,
      labour_cost: 400,
      other_expenses: 100,
    });

    const recA = await getPricingRecord(prodA, artisanId);
    const recB = await getPricingRecord(prodB, artisanId);

    expect(recA).not.toBeNull();
    expect(recA?.material_cost).toBe(800);
    expect(recA?.known_cost).toBe(1300);

    expect(recB).toBeNull();
  });
});
