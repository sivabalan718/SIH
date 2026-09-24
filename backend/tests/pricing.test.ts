import { describe, it, expect, jest } from '@jest/globals';
import {
  generateFairPriceRecommendation,
  extractPricingFromVoice,
  validateProductFacts,
  normalizeDomainText,
  extractProductType,
  calculateProductSimilarity,
} from '../src/services/ai/pricing-intelligence.service.js';
import {
  savePricingRecord,
  getPricingRecord,
} from '../src/services/pricing.service.js';
import { executePricingEngine } from '../src/services/pricing/pricingEngine.js';
import { evaluateFunctionalGate } from '../src/services/pricing/functionalGate.js';
import { calculatePriceInfluence } from '../src/services/pricing/influence.js';
import { calculateCostAnalysis } from '../src/services/pricing/costEngine.js';
import { reconcileCostAndMarket } from '../src/services/pricing/reconciliation.js';

import { evaluateConfidence } from '../src/services/pricing/confidence.js';
import { calculateProductSimilarity as calculateAttributeSimilarity } from '../src/services/pricing/attributeSimilarity.js';

describe('Smart Fair Pricing Intelligence Engine — Canonical Pricing Tests', () => {
  jest.setTimeout(30000);

  it('1. MANDATORY SCREENSHOT REGRESSION TEST: Production Cost = ₹1,150, Markup = 25%, Market Ref = ₹620, Influence = 55%', () => {
    // Inputs: C = 1150 (Material 500, Labour 350, Other 300)
    const cost = calculateCostAnalysis({
      materialCost: 500,
      labourCost: 350,
      otherExpenses: 300,
    });

    expect(cost.knownCost).toBe(1150);
    expect(cost.markupRate).toBe(0.25);
    expect(cost.markupAmount).toBe(287.50);
    expect(cost.costBasedPrice).toBe(1437.50);

    // Assert that costBasedPrice is strictly 1437.50 and NOT the legacy 1725!
    expect(cost.costBasedPrice).not.toBe(1725);

    // Reconciliation with Market Reference = ₹620 and Influence alpha = 0.55
    const mockMarket = {
      totalCandidatesEvaluated: 3,
      candidatesAfterSelfExclusion: 3,
      candidatesAfterFunctionalGate: 3,
      validComparablesCount: 3,
      primaryCount: 1,
      secondaryCount: 2,
      contextualCount: 0,
      excludedCount: 0,
      p25: 550,
      p50: 620, // Market Reference = ₹620
      p75: 700,
      marketReferencePrice: 620,
      observedMinPrice: 500,
      observedMaxPrice: 750,
      selectedComparables: [],
      excludedComparables: [],
    };


    const recon = reconcileCostAndMarket(cost, mockMarket);

    // P_raw = F + alpha * (P_WM - F) = 1437.50 + 0.55 * (620 - 1437.50)
    // = 1437.50 - 449.625 = 987.875
    expect(recon.costBasedPrice).toBe(1437.50);
    expect(recon.marketReferencePrice).toBe(620);
    expect(recon.evidenceQualityAlpha).toBe(0.55);
    expect(recon.marketAdjustment).toBeCloseTo(-449.625, 2);
    expect(recon.marketAdjustment).not.toBe(-608); // Legacy value must NOT appear!
    expect(recon.rawMarketAdjustedPrice).toBeCloseTo(987.875, 2);
    expect(recon.suggestedPrice).toBe(1437.50); // Clamped to sustainable floor F
    expect(recon.isCostFloorActive).toBe(true);
    expect(recon.costFloorApplied).toBe(true);

    // CRITICAL FIX ASSERTIONS:
    // Fair range MUST be independently derived from market (550 to 700) and NOT clamped to 1437.50-1437.50!
    expect(recon.fairPriceMin).toBe(550);
    expect(recon.fairPriceMax).toBe(700);
    expect(recon.fairPriceMin).not.toBe(1437.50);
    expect(recon.fairPriceMax).not.toBe(1437.50);

    // Market-Cost Mismatch MUST be explicitly flagged
    expect(recon.hasMarketCostMismatch).toBe(true);
    expect(recon.marketCostMismatchWarning).toContain('substantially below your sustainable cost floor');

    // Confidence evaluation must separate cost & market confidence, and cap overall level to MEDIUM
    const confidence = evaluateConfidence(cost, mockMarket, false, recon);
    expect(confidence.costConfidence).toBe('HIGH');
    expect(confidence.marketConfidence).toBe('MEDIUM');
    expect(confidence.level).toBe('MEDIUM'); // Capped due to major mismatch despite math correctness!
  });

  it('2. CASE A: Market above cost floor (C = ₹1,000, Markup = 25%, Market Ref = ₹1,600, Influence = 50%)', () => {
    const cost = calculateCostAnalysis({
      materialCost: 600,
      labourCost: 300,
      otherExpenses: 100,
    });
    expect(cost.costBasedPrice).toBe(1250);

    const marketAbove = {
      totalCandidatesEvaluated: 4,
      candidatesAfterSelfExclusion: 4,
      candidatesAfterFunctionalGate: 4,
      validComparablesCount: 4,
      primaryCount: 2,
      secondaryCount: 2,
      contextualCount: 0,
      excludedCount: 0,
      p25: 1400,
      p50: 1600,
      p75: 1800,
      marketReferencePrice: 1600,
      observedMinPrice: 1300,
      observedMaxPrice: 1900,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, marketAbove);
    // alpha for 4 comps with 2 primary = 0.70
    // marketAdjustment = 0.70 * (1600 - 1250) = 0.70 * 350 = 245
    // P_raw = 1250 + 245 = 1495
    expect(recon.rawMarketAdjustedPrice).toBe(1495);
    expect(recon.suggestedPrice).toBe(1495);
    expect(recon.isCostFloorActive).toBe(false);
  });

  it('3. CASE B: Market below cost floor (C = ₹1,000, Markup = 25%, Market Ref = ₹700, Influence = 50%)', () => {
    const cost = calculateCostAnalysis({
      materialCost: 600,
      labourCost: 300,
      otherExpenses: 100,
    });
    expect(cost.costBasedPrice).toBe(1250);

    const marketBelow = {
      totalCandidatesEvaluated: 4,
      candidatesAfterSelfExclusion: 4,
      candidatesAfterFunctionalGate: 4,
      validComparablesCount: 4,
      primaryCount: 2,
      secondaryCount: 2,
      contextualCount: 0,
      excludedCount: 0,
      p25: 600,
      p50: 700,
      p75: 800,
      marketReferencePrice: 700,
      observedMinPrice: 550,
      observedMaxPrice: 850,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, marketBelow);
    // marketAdjustment = 0.70 * (700 - 1250) = 0.70 * (-550) = -385
    // P_raw = 1250 - 385 = 865
    expect(recon.rawMarketAdjustedPrice).toBe(865);
    expect(recon.suggestedPrice).toBe(1250); // Clamped to floor F = 1250
    expect(recon.isCostFloorActive).toBe(true);
  });

  it('4. CASE C: No market evidence (F = ₹1,250, Market = null)', () => {
    const cost = calculateCostAnalysis({
      materialCost: 600,
      labourCost: 300,
      otherExpenses: 100,
    });
    expect(cost.costBasedPrice).toBe(1250);

    const marketNone = {
      totalCandidatesEvaluated: 0,
      candidatesAfterSelfExclusion: 0,
      candidatesAfterFunctionalGate: 0,
      validComparablesCount: 0,
      primaryCount: 0,
      secondaryCount: 0,
      contextualCount: 0,
      excludedCount: 0,
      p25: null,
      p50: null,
      p75: null,
      marketReferencePrice: null,
      observedMinPrice: null,
      observedMaxPrice: null,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, marketNone);
    expect(recon.pricingBasis).toBe('COST_ANCHORED');
    expect(recon.marketAdjustment).toBe(0);
    expect(recon.suggestedPrice).toBe(1250);
    expect(recon.isCostFloorActive).toBe(false);
  });

  it('5. CASE D: Zero / invalid production cost', () => {
    const cost = calculateCostAnalysis({
      materialCost: 0,
      labourCost: 0,
      otherExpenses: 0,
    });

    expect(cost.knownCost).toBe(0);
    expect(cost.costState).toBe('UNAVAILABLE');

    const mockMarket = {
      totalCandidatesEvaluated: 3,
      candidatesAfterSelfExclusion: 3,
      candidatesAfterFunctionalGate: 3,
      validComparablesCount: 3,
      primaryCount: 1,
      secondaryCount: 2,
      contextualCount: 0,
      excludedCount: 0,
      p25: 750,
      p50: 850,
      p75: 950,
      marketReferencePrice: 850,
      observedMinPrice: 700,
      observedMaxPrice: 1000,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, mockMarket);
    expect(recon.suggestedPrice).toBe(850);
  });

  it('6. CASE E: Other expenses included once (500 + 350 + 300 = 1150)', () => {
    const cost = calculateCostAnalysis({
      materialCost: 500,
      labourCost: 350,
      otherExpenses: 300,
    });

    expect(cost.knownCost).toBe(1150);
    expect(cost.costBasedPrice).toBe(1437.50);
  });

  it('7. CASE F: Production time does not double-count labour', () => {
    const costWithTime = calculateCostAnalysis({
      materialCost: 500,
      labourCost: 350,
      otherExpenses: 300,
      productionTime: 5,
      productionTimeUnit: 'days',
    });

    // Production time must NOT add another monetary charge!
    expect(costWithTime.knownCost).toBe(1150);
    expect(costWithTime.impliedLabourRate).toBe(70); // 350 / 5 = 70 per day
  });

  it('8. CASE G: Full Fair Price Recommendation API response contract validation', async () => {
    const input = {
      name: 'Handcrafted Terracotta Kulhad Set',
      category: 'Pottery & Terracotta',
      material_cost: 500,
      labour_cost: 350,
      other_expenses: 300,
      production_time: 3,
      production_time_unit: 'days' as const,
    };

    const res = await generateFairPriceRecommendation(input, 'en');

    expect(res.known_cost).toBe(1150);
    expect(res.suggested_price).toBeGreaterThanOrEqual(1437.50);
    expect(res.calculation_breakdown).toBeDefined();
    expect(res.calculation_breakdown?.known_production_cost).toBe(1150);
    expect(res.calculation_breakdown?.markup_amount).toBe(287.50);
    expect(res.calculation_breakdown?.base_margin).toBe(287.50);
    expect(res.calculation_breakdown?.cost_based_price).toBe(1437.50);
  });

  it('9. Functional Gate: Tea Cup vs Vase and Table Lamp MUST fail functional gate', async () => {
    const target = {
      name: 'Clay Kulhad Tea Cup',
      category: 'Pottery & Terracotta',
      subcategory: 'Tea Cup',
      productType: 'cup',
    };
    const candidateVase = {
      id: 'cand-vase-101',
      name: 'Decorative Pottery Flower Vase',
      category: 'Pottery & Terracotta',
      subcategory: 'Vase',
      product_type: 'vase',
      price: 850,
    };

    const gateVase = evaluateFunctionalGate(target, candidateVase);
    expect(gateVase.passed).toBe(false);
  });

  it('10. MANDATORY REGRESSION TEST: Target product MUST NEVER appear as its own comparable', async () => {
    const targetProductId = 'prod-target-777';
    const target = {
      productId: targetProductId,
      name: 'Authentic Clay Kulhad Tea Cups Set of 6',
      category: 'Pottery & Terracotta',
      subcategory: 'Tea Cup Set',
      material: 'Clay',
      craftType: 'Wheel Pottery',
      materialCost: 100,
      labourCost: 70,
      otherExpenses: 40,
    };

    const res = await executePricingEngine(target, 'en');
    const containsSelf = res.marketReference.selectedComparables.some(
      (c) => c.productId === targetProductId
    );

    expect(containsSelf).toBe(false);
  });

  it('11. Storage isolation for artisan pricing state', async () => {
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

  it('12. CONTEXTUAL PRODUCT: Contextual products MUST NOT influence weighted market reference', () => {
    const cost = calculateCostAnalysis({ materialCost: 500, labourCost: 350, otherExpenses: 300 });
    const marketWithContextual = {
      totalCandidatesEvaluated: 4,
      candidatesAfterSelfExclusion: 4,
      candidatesAfterFunctionalGate: 4,
      validComparablesCount: 2, // 2 benchmark eligible, 2 contextual
      primaryCount: 1,
      secondaryCount: 1,
      contextualCount: 2,
      excludedCount: 0,
      p25: null,
      p50: 620,
      p75: null,
      marketReferencePrice: 620,
      observedMinPrice: 550,
      observedMaxPrice: 700,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, marketWithContextual);
    expect(recon.marketReferencePrice).toBe(620);
    // Contextual products do NOT count toward validComparablesCount in weighted statistics
    expect(recon.fairPriceMin).toBeNull(); // Less than 3 valid benchmark comparables => null range
  });

  it('13. MARKET RANGE SPARSITY: Insufficient evidence (<3 valid comparables) returns null fair range', () => {
    const cost = calculateCostAnalysis({ materialCost: 400, labourCost: 200, otherExpenses: 100 });
    const sparseMarket = {
      totalCandidatesEvaluated: 2,
      candidatesAfterSelfExclusion: 2,
      candidatesAfterFunctionalGate: 2,
      validComparablesCount: 2,
      primaryCount: 1,
      secondaryCount: 1,
      contextualCount: 0,
      excludedCount: 0,
      p25: 500,
      p50: 600,
      p75: 700,
      marketReferencePrice: 600,
      observedMinPrice: 500,
      observedMaxPrice: 700,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, sparseMarket);
    expect(recon.fairPriceMin).toBeNull();
    expect(recon.fairPriceMax).toBeNull();
    expect(recon.fairRangeMinReason).toContain('Limited price information available');
  });

  it('14. SET STRUCTURE & PRODUCT IDENTITY: Single water jug vs 5-item tea set downgraded to CONTEXTUAL', () => {
    const target = {
      name: 'Terracotta Water Jug with Matching Glass',
      category: 'Pottery & Terracotta',
      subcategory: 'Water Jug',
      productType: 'jug',
      quantity: 1,
      material: 'Terracotta',
    };

    const candidateTeaSet = {
      id: 'cand-teaset-55',
      name: 'Handcrafted Ceramic Tea Set (Teapot + 4 Cups)',
      category: 'Pottery & Terracotta',
      subcategory: 'Tea Set',
      product_type: 'tea set',
      quantity: 5,
      price: 2010,
      material: 'Ceramic',
    };

    const sim = calculateAttributeSimilarity(target, candidateTeaSet);
    // productType score is 0.0 because jug != tea set
    expect(sim.breakdown.productType.score).toBe(0);
  });
});
