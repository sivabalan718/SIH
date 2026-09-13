import { TargetProductInput, RawCandidateProduct, MarketReference, ComparableResult, ExcludedComparableItem } from './types.js';
import { PRICING_CONFIG } from './config.js';
import { evaluateFunctionalGate } from './functionalGate.js';
import { calculateProductSimilarity } from './attributeSimilarity.js';
import { calculatePriceInfluence } from './influence.js';
import { calculateWeightedStatistics } from './weightedStatistics.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { getProductsByArtisan } from '../product.service.js';
import { logger } from '../../utils/logger.js';

export async function fetchAndEvaluateComparables(
  target: TargetProductInput
): Promise<MarketReference> {
  const targetProductId = target.productId || null;

  // 1. Fetch Candidates from Supabase and In-Memory
  let rawCandidates: RawCandidateProduct[] = [];

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('products')
      .select('id, name, category, subcategory, material, craft_type, features, description, price, image_url, artisan_id, status')
      .eq('status', 'PUBLISHED')
      .gt('price', 0);

    // Database / Query Level Self-Exclusion
    if (targetProductId) {
      query = query.neq('id', targetProductId);
    }

    const { data, error } = await query.limit(250);

    if (!error && data) {
      rawCandidates = data.map((p: any) => ({
        id: p.id,
        name: p.name || 'Craft Product',
        category: p.category || null,
        subcategory: p.subcategory || null,
        material: p.material || null,
        craft_type: p.craft_type || null,
        features: Array.isArray(p.features) ? p.features : [],
        description: p.description || '',
        price: p.price,
        image_url: p.image_url || null,
        artisan_id: p.artisan_id || null,
      }));
    }
  } catch (e) {}

  try {
    const memProds = await getProductsByArtisan('all');
    const memList: RawCandidateProduct[] = memProds
      .filter((p) => p.status === 'PUBLISHED' && p.price > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || null,
        subcategory: p.subcategory || null,
        material: p.material || null,
        craft_type: p.craft_type || null,
        features: p.features || [],
        description: p.description || '',
        price: p.price,
        image_url: (p as any).images && (p as any).images[0] ? (p as any).images[0] : null,
        artisan_id: p.artisan_id || null,
      }));
    rawCandidates = [...rawCandidates, ...memList];
  } catch (e) {}

  return evaluateCandidates(target, rawCandidates);
}

export function evaluateCandidates(
  target: TargetProductInput,
  rawCandidates: RawCandidateProduct[]
): MarketReference {
  const targetProductId = target.productId || null;
  const totalCandidatesEvaluated = rawCandidates.length;

  // 2. MANDATORY Service-Level Self-Exclusion by Canonical Product ID
  let candidatesAfterSelfExclusion: RawCandidateProduct[] = [];
  if (targetProductId) {
    candidatesAfterSelfExclusion = rawCandidates.filter((cand) => cand.id !== targetProductId);
  } else {
    candidatesAfterSelfExclusion = [...rawCandidates];
  }

  // Deduplicate by ID
  const seenIds = new Set<string>();
  const dedupedCandidates: RawCandidateProduct[] = [];
  for (const cand of candidatesAfterSelfExclusion) {
    if (!seenIds.has(cand.id)) {
      seenIds.add(cand.id);
      dedupedCandidates.push(cand);
    }
  }

  // 3. Functional Compatibility Gate + Economic Similarity Scoring
  let candidatesAfterFunctionalGate = 0;
  const evaluatedComparables: ComparableResult[] = [];
  const excludedComparables: ExcludedComparableItem[] = [];

  for (const cand of dedupedCandidates) {
    const gateRes = evaluateFunctionalGate(target, cand);

    if (!gateRes.passed) {
      excludedComparables.push({
        productId: cand.id,
        productName: cand.name,
        price: cand.price,
        rawSimilarity: 0,
        functionalFamily: gateRes.functionalFamilyCandidate,
        exclusionReason: `Excluded — functionally incompatible (${gateRes.reason})`,
      });
      continue;
    }

    candidatesAfterFunctionalGate++;

    const simRes = calculateProductSimilarity(target, cand);
    const rawScore = simRes.overallSimilarity;

    // CANONICAL FINAL COMPARABILITY SCORE:
    // If functional gate is only contextual, scale the final score into the contextual band (0.40 - 0.52)
    // so the displayed similarity % NEVER contradicts the CONTEXTUAL tier!
    let finalScore = rawScore;
    let tier: ComparableResult['tier'] = 'EXCLUDED';
    let tierLabel = 'EXCLUDED';

    if (gateRes.compatibilityLevel === 'CONTEXTUAL_ONLY') {
      finalScore = Math.min(Math.round(rawScore * 0.60 * 100) / 100, 0.52);
      finalScore = Math.max(finalScore, 0.40);
      tier = 'CONTEXTUAL';
      tierLabel = 'Contextual Reference (Not Used for Pricing)';
    } else {
      // Gate is COMPATIBLE
      if (rawScore >= PRICING_CONFIG.primarySimilarityThreshold) {
        // Protect against weak product identity matches
        if (simRes.breakdown.productType.score < 0.70 || simRes.breakdown.intendedUse.score < 0.70) {
          finalScore = Math.min(rawScore, 0.72);
          tier = 'SECONDARY';
          tierLabel = 'Secondary Comparable (Used for Pricing)';
        } else {
          finalScore = rawScore;
          tier = 'PRIMARY';
          tierLabel = 'Primary Comparable (Used for Pricing)';
        }
      } else if (rawScore >= PRICING_CONFIG.secondarySimilarityThreshold) {
        finalScore = rawScore;
        tier = 'SECONDARY';
        tierLabel = 'Secondary Comparable (Used for Pricing)';
      } else if (rawScore >= PRICING_CONFIG.contextualSimilarityThreshold) {
        finalScore = rawScore;
        tier = 'CONTEXTUAL';
        tierLabel = 'Contextual Reference (Not Used for Pricing)';
      } else {
        finalScore = rawScore;
        tier = 'EXCLUDED';
        tierLabel = 'Excluded (Below Threshold)';
      }
    }

    if (tier === 'EXCLUDED') {
      excludedComparables.push({
        productId: cand.id,
        productName: cand.name,
        price: cand.price,
        rawSimilarity: rawScore,
        functionalFamily: gateRes.functionalFamilyCandidate,
        exclusionReason: `Excluded — below minimum comparability threshold (${Math.round(rawScore * 100)}% < 40%)`,
      });
      continue;
    }

    const benchmarkEligible = tier === 'PRIMARY' || tier === 'SECONDARY';

    // Format human-readable matched attributes (clean, accurate labels)
    const humanMatched: string[] = [];
    if (simRes.breakdown.productType.score >= 0.70) {
      humanMatched.push('Product type match');
    }
    if (simRes.breakdown.intendedUse.score >= 0.70) {
      humanMatched.push('Intended use');
    }
    if (simRes.breakdown.material.score >= 0.70) {
      humanMatched.push(cand.material ? `${cand.material} material` : 'Matching material');
    }
    if (simRes.breakdown.craft.score >= 0.70) {
      humanMatched.push(cand.craft_type ? `${cand.craft_type} craft` : 'Handmade pottery');
    }
    if (simRes.breakdown.quantity.score >= 0.70) {
      humanMatched.push('Similar quantity scale');
    }
    if (simRes.breakdown.features.score >= 0.70) {
      humanMatched.push('Shared features');
    }
    if (humanMatched.length === 0) {
      humanMatched.push('General craft context');
    }

    evaluatedComparables.push({
      productId: cand.id,
      productName: cand.name,
      price: cand.price,
      similarity: finalScore,
      similarityPercentage: Math.round(finalScore * 100),
      finalSimilarityScore: finalScore,
      tier,
      tierLabel,
      functionalCompatibility: gateRes.compatibilityLevel,
      benchmarkEligible,
      rawInfluence: 0,
      normalizedInfluence: 0,
      cappedInfluence: 0,
      influenceWeight: 0,
      matchedAttributes: humanMatched,
      differingAttributes: simRes.differingAttributes,
      priceInfluenceLevel: 'LOW',
      priceInfluenceExplanation: '',
      breakdown: simRes.breakdown,
      imageUrl: cand.image_url || undefined,
    });
  }

  // Sort: Benchmark eligible first, then score descending
  evaluatedComparables.sort((a, b) => {
    if (a.benchmarkEligible !== b.benchmarkEligible) {
      return a.benchmarkEligible ? -1 : 1;
    }
    return b.similarity - a.similarity;
  });

  // Limit to MAX_ACTIVE_COMPARABLES = 8 for pricing calculations
  const selectedComparables = evaluatedComparables.slice(0, PRICING_CONFIG.maxActiveComparables);
  const eligibleComparables = selectedComparables.filter((c) => c.benchmarkEligible);

  // 4. DEFENSIVE REGRESSION ASSERTION IMMEDIATELY BEFORE CALCULATIONS
  if (targetProductId) {
    const selfCompFound = selectedComparables.some((c) => c.productId === targetProductId);
    if (selfCompFound) {
      logger.error(`[CRITICAL_PRICING_ERROR] Self-product comparison detected for target product ${targetProductId}! Failing execution.`);
      throw new Error(`CRITICAL PRICING INTEGRITY VIOLATION: Target product ${targetProductId} appeared as its own comparable.`);
    }
  }

  // 5. Calculate S^2 Influence Weights & Anti-Dominance Cap (45%)
  const influenceMap = calculatePriceInfluence(
    eligibleComparables.map((c) => ({ productId: c.productId, similarity: c.similarity }))
  );

  for (const comp of selectedComparables) {
    if (comp.benchmarkEligible) {
      const inf = influenceMap.get(comp.productId);
      if (inf) {
        comp.rawInfluence = inf.rawInfluence;
        comp.normalizedInfluence = inf.normalizedInfluence;
        comp.cappedInfluence = inf.cappedInfluence;
        comp.influenceWeight = inf.cappedInfluence;
        comp.priceInfluenceLevel = inf.priceInfluenceLevel;
        comp.priceInfluenceExplanation = inf.explanation;
      }
    } else {
      comp.rawInfluence = 0;
      comp.normalizedInfluence = 0;
      comp.cappedInfluence = 0;
      comp.influenceWeight = 0;
      comp.priceInfluenceLevel = 'NONE';
      comp.priceInfluenceExplanation = 'None — contextual reference only.';
    }
  }

  // 6. Calculate Weighted Statistics (Weighted Median P50, P25, P75)
  const weightedItems = eligibleComparables.map((c) => ({
    price: c.price,
    weight: c.cappedInfluence,
  }));

  const stats = calculateWeightedStatistics(weightedItems);

  const primaryCount = selectedComparables.filter((c) => c.tier === 'PRIMARY').length;
  const secondaryCount = selectedComparables.filter((c) => c.tier === 'SECONDARY').length;
  const contextualCount = selectedComparables.filter((c) => c.tier === 'CONTEXTUAL').length;
  const excludedCount = evaluatedComparables.length - selectedComparables.length + excludedComparables.length;

  return {
    totalCandidatesEvaluated,
    candidatesAfterSelfExclusion: dedupedCandidates.length,
    candidatesAfterFunctionalGate,
    validComparablesCount: eligibleComparables.length,
    primaryCount,
    secondaryCount,
    contextualCount,
    excludedCount,
    p25: stats.p25,
    p50: stats.p50,
    p75: stats.p75,
    marketReferencePrice: stats.p50,
    observedMinPrice: stats.minPrice,
    observedMaxPrice: stats.maxPrice,
    selectedComparables,
    excludedComparables,
  };
}
