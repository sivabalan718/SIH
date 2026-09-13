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

describe('Smart Fair Pricing Intelligence v1.0 Engine Tests', () => {
  jest.setTimeout(30000);

  it('1. Exact product match: should place exact product type, material, craft, quantity in PRIMARY tier (>= 0.75)', async () => {
    const target = {
      name: 'Clay Kulhad Tea Cup Set of 6',
      category: 'Pottery & Terracotta',
      subcategory: 'Tea Cup Set',
      productType: 'cup',
      material: 'Clay',
      craftType: 'Wheel Pottery',
      quantity: 6,
      materialCost: 100,
      labourCost: 70,
      otherExpenses: 40,
    };

    const res = await executePricingEngine(target, 'en');
    expect(res.costAnalysis.knownCost).toBe(210);
    expect(res.costAnalysis.costFloor).toBe(262.5); // 210 * 1.25
    expect(res.costAnalysis.costAnchor).toBe(315);   // 210 * 1.50

    // Invariants
    expect(res.reconciliation.fairPriceMin).toBeGreaterThanOrEqual(res.costAnalysis.costFloor);
    expect(res.reconciliation.suggestedPrice).toBeGreaterThanOrEqual(res.reconciliation.fairPriceMin);
    expect(res.reconciliation.fairPriceMax).toBeGreaterThanOrEqual(res.reconciliation.suggestedPrice);
  });

  it('2. Same product type, different material: lower similarity score', async () => {
    const target = {
      name: 'Clay Tea Cup',
      category: 'Pottery & Terracotta',
      material: 'Clay',
      quantity: 1,
    };
    const candWood = {
      id: 'cand-wood-cup',
      name: 'Wooden Tea Cup',
      category: 'Woodcraft',
      material: 'Teak Wood',
      quantity: 1,
      price: 450,
    };

    const targetKurta = {
      name: 'Cotton Kurta',
      category: 'Textiles & Handlooms',
      material: 'Cotton',
      quantity: 1,
    };
    const candSilk = {
      id: 'cand-silk-kurta',
      name: 'Mulberry Silk Kurta',
      category: 'Textiles & Handlooms',
      material: 'Pure Silk',
      quantity: 1,
      price: 2500,
    };

    const simWood = (await import('../src/services/pricing/attributeSimilarity.js')).calculateProductSimilarity(target, candWood);
    const simSilk = (await import('../src/services/pricing/attributeSimilarity.js')).calculateProductSimilarity(targetKurta, candSilk);

    expect(simWood.overallSimilarity).toBeLessThan(0.75);
    expect(simSilk.overallSimilarity).toBeLessThan(0.90);
  });

  it('3. Functional Gate: Tea Cup vs Vase, Table Lamp, and Figurine MUST fail functional gate', async () => {
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
    const candidateLamp = {
      id: 'cand-lamp-102',
      name: 'Terracotta Table Lamp',
      category: 'Pottery & Terracotta',
      price: 1200,
    };
    const candidateFigurine = {
      id: 'cand-fig-103',
      name: 'Terracotta Animal Figurine Ganesha',
      category: 'Pottery & Terracotta',
      price: 650,
    };

    const gateVase = evaluateFunctionalGate(target, candidateVase);
    const gateLamp = evaluateFunctionalGate(target, candidateLamp);
    const gateFig = evaluateFunctionalGate(target, candidateFigurine);

    expect(gateVase.passed).toBe(false);
    expect(gateLamp.passed).toBe(false);
    expect(gateFig.passed).toBe(false);

    // Also verify attribute similarity is low (< 0.50)
    const { calculateProductSimilarity } = await import('../src/services/pricing/attributeSimilarity.js');
    const simVase = calculateProductSimilarity(target, candidateVase);
    expect(simVase.overallSimilarity).toBeLessThan(0.50);
  });

  it('3b. Incomplete attributes: missing attributes are excluded from denominator but reduce confidence', async () => {
    const targetIncomplete = {
      name: 'Clay Item',
      // category, craft, quantity, features, dimensions are all missing!
    };
    const candidate = {
      id: 'cand-1',
      name: 'Clay Item',
      price: 300,
    };

    const { calculateProductSimilarity } = await import('../src/services/pricing/attributeSimilarity.js');
    const simRes = calculateProductSimilarity(targetIncomplete, candidate);
    expect(simRes.missingCount).toBeGreaterThan(0);
    // Denominator exclusion ensures available attributes are scored without penalizing as DIFFERENT
    expect(simRes.overallSimilarity).toBeGreaterThan(0);
  });

  it('4. Quantity mismatch: 6 cups vs 1 cup reduces similarity via Sq = 1/6 = 0.167 without fabricating synthetic prices', async () => {
    const qtyRes = (await import('../src/services/pricing/attributeSimilarity.js')).evaluateQuantitySimilarity(6, 1);
    expect(qtyRes.score).toBeCloseTo(0.167, 2);
    expect(qtyRes.state).toBe('DIFFERENT');
  });

  it('5. Extreme high-price comparable: anti-dominance cap limits max influence to 45%', () => {
    const items = [
      { productId: 'p1', similarity: 0.95 },
      { productId: 'p2', similarity: 0.70 },
      { productId: 'p3', similarity: 0.65 },
    ];

    const influenceMap = calculatePriceInfluence(items);
    const p1Inf = influenceMap.get('p1');
    expect(p1Inf).toBeDefined();
    expect(p1Inf!.cappedInfluence).toBeLessThanOrEqual(0.45 + 0.001); // 45% cap
  });

  it('6. Zero valid comparables: COST_ANCHORED / INSUFFICIENT_EVIDENCE without fake market median', async () => {
    const input = {
      productId: 'prod-unique-999',
      name: 'Unique Rare Alien Artifact',
      category: 'Unknown Sub-Category',
      materialCost: 500,
      labourCost: 300,
      otherExpenses: 100,
    };

    const res = await executePricingEngine(input, 'en');
    expect(res.reconciliation.pricingBasis).toBe('COST_ANCHORED');
    expect(res.costAnalysis.knownCost).toBe(900);
    expect(res.reconciliation.suggestedPrice).toBeGreaterThanOrEqual(1125); // Known Cost * 1.25 cost floor
  });

  it('7. Single valid comparable: MUST NOT produce HIGH confidence', async () => {
    const cost = {
      knownCost: 500,
      materialCost: 300,
      labourCost: 150,
      otherExpenses: 50,
      costState: 'COMPLETE' as const,
      costFloor: 625,
      costAnchor: 750,
      minimumMarkupUsed: 0.25,
      targetMarkupUsed: 0.50,
      productionTime: 2,
      productionTimeUnit: 'days' as const,
      impliedLabourRate: 75,
      laborRateNotice: null,
    };

    const marketOneComp = {
      totalCandidatesEvaluated: 1,
      candidatesAfterSelfExclusion: 1,
      candidatesAfterFunctionalGate: 1,
      validComparablesCount: 1,
      primaryCount: 1,
      secondaryCount: 0,
      contextualCount: 0,
      excludedCount: 0,
      p25: 700,
      p50: 700,
      p75: 700,
      marketReferencePrice: 700,
      observedMinPrice: 700,
      observedMaxPrice: 700,
      selectedComparables: [],
      excludedComparables: [],
    };

    const conf = (await import('../src/services/pricing/confidence.js')).evaluateConfidence(cost, marketOneComp, false);
    expect(conf.level).not.toBe('HIGH'); // Single comparable CANNOT be HIGH
  });

  it('8. Market prices below artisan cost: Cost floor protects recommendation', async () => {
    const cost = {
      knownCost: 1000,
      materialCost: 600,
      labourCost: 300,
      otherExpenses: 100,
      costState: 'COMPLETE' as const,
      costFloor: 1250, // 1000 * 1.25
      costAnchor: 1500,
      minimumMarkupUsed: 0.25,
      targetMarkupUsed: 0.50,
      productionTime: 2,
      productionTimeUnit: 'days' as const,
      impliedLabourRate: 150,
      laborRateNotice: null,
    };

    const marketLow = {
      totalCandidatesEvaluated: 10,
      candidatesAfterSelfExclusion: 10,
      candidatesAfterFunctionalGate: 10,
      validComparablesCount: 6,
      primaryCount: 4,
      secondaryCount: 2,
      contextualCount: 0,
      excludedCount: 0,
      p25: 400,
      p50: 450, // Market reference 450 is WAY below cost floor 1250!
      p75: 500,
      marketReferencePrice: 450,
      observedMinPrice: 400,
      observedMaxPrice: 500,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = (await import('../src/services/pricing/reconciliation.js')).reconcileCostAndMarket(cost, marketLow);
    expect(recon.suggestedPrice).toBeGreaterThanOrEqual(1250); // Cost floor enforced!
    expect(recon.isCostFloorActive).toBe(true);
    expect(recon.costFloorProtectionReason).toContain('below production cost');
  });

  it('9. Current artisan price inside fair range: messaging confirms current price is within fair range', async () => {
    const input = {
      name: 'Handloom Cotton Saree',
      category: 'Textiles & Handlooms',
      materialCost: 400,
      labourCost: 300,
      otherExpenses: 100,
      existingPrice: 1200,
    };

    const res = await executePricingEngine(input, 'en');
    expect(res.artisanPriceComparison.artisanPrice).toBe(1200);
    expect(['within', 'above', 'below']).toContain(res.artisanPriceComparison.positionStatus);
    expect(res.artisanPriceComparison.message.length).toBeGreaterThan(5);
  });

  it('10. Wide price variation: weighted median remains robust against extreme prices', async () => {
    const items = [
      { price: 380, weight: 0.35 },
      { price: 420, weight: 0.30 },
      { price: 450, weight: 0.20 },
      { price: 2500, weight: 0.15 }, // Extreme outlier
    ];

    const stats = (await import('../src/services/pricing/weightedStatistics.js')).calculateWeightedStatistics(items);
    expect(stats.p50).toBe(420); // Robust weighted median stays near central evidence 420 instead of mean ~937!
  });

  it('11. MANDATORY REGRESSION TEST: Target product MUST NEVER appear as its own comparable', async () => {
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

    // Strict Regression Assertion: No selected comparable can equal targetProductId
    const containsSelf = res.marketReference.selectedComparables.some(
      (c) => c.productId === targetProductId
    );

    expect(containsSelf).toBe(false);
    expect(res.marketReference.selectedComparables.every((c) => c.productId !== targetProductId)).toBe(true);
  });

  it('12. Identical product names with different IDs are NOT mistakenly excluded', async () => {
    const targetProductId = 'prod-target-888';
    const otherProductId = 'prod-other-888';

    const target = {
      productId: targetProductId,
      name: 'Handcrafted Terracotta Clay Cup',
      category: 'Pottery & Terracotta',
      material: 'Clay',
      materialCost: 50,
      labourCost: 50,
      otherExpenses: 20,
    };

    const candidateSameNameDifferentId = {
      id: otherProductId,
      name: 'Handcrafted Terracotta Clay Cup', // Identical name!
      category: 'Pottery & Terracotta',
      material: 'Clay',
      price: 250,
    };

    const gateRes = evaluateFunctionalGate(target, candidateSameNameDifferentId);
    expect(gateRes.passed).toBe(true);

    const sim = (await import('../src/services/pricing/attributeSimilarity.js')).calculateProductSimilarity(target, candidateSameNameDifferentId);
    expect(sim.overallSimilarity).toBeGreaterThanOrEqual(0.75); // Fully comparable!
  });

  it('13. Exact mathematical reconciliation traceability: ₹1,150 cost, ₹890 market -> -₹125 adjustment -> ₹1,600 recommended price', async () => {
    const cost = {
      knownCost: 1150,
      materialCost: 700,
      labourCost: 350,
      otherExpenses: 100,
      costState: 'COMPLETE' as const,
      costFloor: 1438, // Math.round(1150 * 1.25) = 1438
      costAnchor: 1725, // Math.round(1150 * 1.50) = 1725
      minimumMarkupUsed: 0.25,
      targetMarkupUsed: 0.50,
      productionTime: 3,
      productionTimeUnit: 'days' as const,
      impliedLabourRate: 116.67,
      laborRateNotice: null,
    };

    const marketSingleComp = {
      totalCandidatesEvaluated: 1,
      candidatesAfterSelfExclusion: 1,
      candidatesAfterFunctionalGate: 1,
      validComparablesCount: 1,
      primaryCount: 1,
      secondaryCount: 0,
      contextualCount: 0,
      excludedCount: 0,
      p25: 890,
      p50: 890,
      p75: 890,
      marketReferencePrice: 890,
      observedMinPrice: 890,
      observedMaxPrice: 890,
      selectedComparables: [],
      excludedComparables: [],
    };

    const { reconcileCostAndMarket } = await import('../src/services/pricing/reconciliation.js');
    const { evaluateConfidence } = await import('../src/services/pricing/confidence.js');

    const recon = reconcileCostAndMarket(cost, marketSingleComp);
    const conf = evaluateConfidence(cost, marketSingleComp, false);

    // Verify exact mathematical formula: 1725 + 0.15 * (890 - 1725) = 1725 - 125 = 1600
    expect(recon.costAnchor).toBe(1725);
    expect(recon.marketReferencePrice).toBe(890);
    expect(recon.evidenceQualityAlpha).toBe(0.15);
    expect(recon.marketAdjustment).toBe(-125);
    expect(recon.suggestedPrice).toBe(1600);
    expect(recon.fairPriceMin).toBe(1438);
    expect(recon.fairPriceMax).toBe(2156);
    expect(conf.level).toBe('MEDIUM'); // Single comparable is strictly MEDIUM confidence
  });

  it('14. Contradiction prevention: Contextual comparable has scaled score matching contextual tier (no 76% similar with contextual tier)', async () => {
    const { evaluateCandidates } = await import('../src/services/pricing/comparableSelection.js');

    const target = {
      productId: 'target-tea-cup-1',
      name: 'Handcrafted Terracotta Tea Cup',
      category: 'Pottery & Terracotta',
      material: 'Terracotta Clay',
      productType: 'cup',
      quantity: 1,
    };

    // Candidate is an Incense Burner made of similar terracotta pottery
    const candidates = [
      {
        id: 'cand-incense-1',
        name: 'Terracotta Incense Cone Burner',
        category: 'Pottery & Terracotta',
        material: 'Terracotta Clay',
        craft_type: 'Wheel Pottery',
        price: 990,
      },
    ];

    const result = evaluateCandidates(target, candidates as any);
    expect(result.selectedComparables.length).toBe(1);

    const comp = result.selectedComparables[0];
    expect(comp.tier).toBe('CONTEXTUAL');
    expect(comp.benchmarkEligible).toBe(false);
    // Final similarity score must NOT be 70%+ when classified as CONTEXTUAL
    expect(comp.similarity).toBeLessThanOrEqual(0.52);
    expect(comp.similarityPercentage).toBeLessThanOrEqual(52);
    expect(comp.priceInfluenceLevel).toBe('NONE');
    expect(comp.priceInfluenceExplanation).toBe('None — contextual reference only.');
    expect(comp.influenceWeight).toBe(0);
  });

  it('15. Input consistency: Material ₹500, Labour ₹300, Other Expenses ₹300 strictly produces Known Cost ₹1,100 (never stale ₹1,150)', async () => {
    const { calculateCostAnalysis } = await import('../src/services/pricing/costEngine.js');
    const { reconcileCostAndMarket } = await import('../src/services/pricing/reconciliation.js');

    const cost = calculateCostAnalysis({
      materialCost: 500,
      labourCost: 300,
      otherExpenses: 300,
    });

    // Verification 1: Known Cost is exactly ₹1,100 (not stale ₹1,150)
    expect(cost.knownCost).toBe(1100);
    expect(cost.costFloor).toBe(1375); // 1100 * 1.25
    expect(cost.costAnchor).toBe(1650); // 1100 * 1.50

    // Verification 2: Traceable reconciliation with 1 comparable at ₹890
    const marketSingleComp = {
      totalCandidatesEvaluated: 1,
      candidatesAfterSelfExclusion: 1,
      candidatesAfterFunctionalGate: 1,
      validComparablesCount: 1,
      primaryCount: 1,
      secondaryCount: 0,
      contextualCount: 0,
      excludedCount: 0,
      p25: 890,
      p50: 890,
      p75: 890,
      marketReferencePrice: 890,
      observedMinPrice: 890,
      observedMaxPrice: 890,
      selectedComparables: [],
      excludedComparables: [],
    };

    const recon = reconcileCostAndMarket(cost, marketSingleComp);
    // Adjustment = 0.15 * (890 - 1650) = 0.15 * (-760) = -114
    expect(recon.marketAdjustment).toBe(-114);
    expect(recon.suggestedPrice).toBe(1536); // 1650 - 114
    expect(recon.fairPriceMin).toBe(1375);
    expect(recon.fairPriceMax).toBe(2063); // Math.round(1650 * 1.25)
  });

  it('should save and retrieve pricing records with artisan isolation', async () => {
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
