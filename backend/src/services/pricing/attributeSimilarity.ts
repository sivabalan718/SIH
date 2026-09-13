import { TargetProductInput, RawCandidateProduct, AttributeMatchBreakdown, MatchState } from './types.js';
import { CATEGORY_PROFILES, AttributeWeights, PRICING_CONFIG, CategoryProfileKey } from './config.js';
import { extractTokens, normalizeText, detectCategoryProfile } from './normalization.js';
import { evaluateMaterialSimilarity } from './materialSimilarity.js';
import { detectFunctionalFamily, FunctionalFamily } from './functionalGate.js';

export interface AttributeSimilarityResult {
  overallSimilarity: number; // 0..1
  breakdown: AttributeMatchBreakdown;
  matchedAttributes: string[];
  differingAttributes: string[];
  missingCount: number;
}

// Stop words to strip from product identity so material or marketing words don't create false product-type matches
const MATERIAL_MARKETING_STOP_WORDS = new Set([
  'clay', 'terracotta', 'pottery', 'ceramic', 'glazed', 'wood', 'wooden', 'teak', 'rosewood', 'sheesham',
  'cotton', 'silk', 'mulberry', 'khadi', 'linen', 'wool', 'brass', 'copper', 'bronze', 'bell metal',
  'metal', 'iron', 'stone', 'marble', 'granite', 'glass', 'bamboo', 'jute', 'leather',
  'handmade', 'handcrafted', 'handwoven', 'handloom', 'traditional', 'authentic', 'premium',
  'beautiful', 'decorative', 'natural', 'pure', 'organic', 'vintage', 'rustic', 'antique',
  'set', 'pack', 'piece', 'pieces', 'combo', 'craft', 'art', 'design', 'indian', 'desi'
]);

// Common functional synonyms for product identity
const PRODUCT_IDENTITY_SYNONYMS: Array<Set<string>> = [
  new Set(['cup', 'cups', 'kulhad', 'kulhads', 'mug', 'mugs', 'glass', 'glasses', 'tumbler', 'tumblers', 'teacup']),
  new Set(['plate', 'plates', 'thali', 'platter', 'platters', 'saucer', 'dish']),
  new Set(['bowl', 'bowls', 'katori', 'handi', 'serving bowl']),
  new Set(['bottle', 'flask', 'water bottle', 'pitcher', 'jug', 'surahi']),
  new Set(['vase', 'flower vase', 'floor vase', 'urn', 'planter', 'pot']),
  new Set(['diya', 'diyas', 'lamp', 'lamps', 'deepak', 'vilakku', 'lantern']),
  new Set(['saree', 'sari', 'sarees']),
  new Set(['kurta', 'kurti', 'kurtas', 'tunic', 'shirt']),
  new Set(['shawl', 'stole', 'dupatta', 'chaddar', 'wrap']),
  new Set(['necklace', 'choker', 'mala', 'haar']),
  new Set(['earring', 'earrings', 'jhumka', 'jhumkas', 'stud', 'studs']),
  new Set(['bangle', 'bangles', 'bracelet', 'bracelets', 'kada']),
  new Set(['figurine', 'idol', 'statue', 'sculpture', 'murti']),
];

export function extractCoreProductNouns(text?: string | null): string[] {
  if (!text) return [];
  const rawTokens = extractTokens(normalizeText(text));
  // Filter out numbers, single characters, and material/marketing stop words
  return rawTokens.filter((t) => t.length > 1 && !/^\d+$/.test(t) && !MATERIAL_MARKETING_STOP_WORDS.has(t));
}

export function evaluateQuantitySimilarity(tQty?: number | null, cQty?: number | null): { score: number; state: MatchState } {
  const q1 = tQty && tQty > 0 ? tQty : 1;
  const q2 = cQty && cQty > 0 ? cQty : 1;

  if (q1 === q2) return { score: 1.0, state: 'EXACT' };

  const minQ = Math.min(q1, q2);
  const maxQ = Math.max(q1, q2);
  const ratio = minQ / maxQ;

  if (ratio >= 0.8) return { score: Math.round(ratio * 100) / 100, state: 'STRONG_RELATED' };
  if (ratio >= 0.4) return { score: Math.round(ratio * 100) / 100, state: 'PARTIAL' };
  return { score: Math.round(ratio * 100) / 100, state: 'DIFFERENT' };
}

export function evaluateProductTypeSimilarity(
  tName?: string | null,
  tSub?: string | null,
  tType?: string | null,
  cName?: string | null,
  cSub?: string | null,
  cType?: string | null
): { score: number; state: MatchState } {
  // Extract core product nouns without material or marketing stop words
  const tNouns = extractCoreProductNouns(`${tType || ''} ${tSub || ''} ${tName || ''}`);
  const cNouns = extractCoreProductNouns(`${cType || ''} ${cSub || ''} ${cName || ''}`);

  if (tNouns.length === 0 || cNouns.length === 0) {
    return { score: 0.0, state: 'MISSING' };
  }

  // 1. Direct noun match
  const exactCommon = tNouns.filter((n) => cNouns.includes(n));
  if (exactCommon.length > 0) {
    if (exactCommon.length === Math.max(tNouns.length, cNouns.length)) {
      return { score: 1.0, state: 'EXACT' };
    }
    return { score: 0.85, state: 'STRONG_RELATED' };
  }

  // 2. Check known functional product synonyms (e.g. cup ↔ mug ↔ kulhad)
  for (const synSet of PRODUCT_IDENTITY_SYNONYMS) {
    const tHas = tNouns.some((n) => synSet.has(n));
    const cHas = cNouns.some((n) => synSet.has(n));
    if (tHas && cHas) {
      return { score: 0.80, state: 'STRONG_RELATED' };
    }
  }

  // Completely different product noun (e.g. cup vs vase or lamp)
  return { score: 0.0, state: 'DIFFERENT' };
}

export function evaluateIntendedUseSimilarity(
  tUse?: string | null,
  tName?: string | null,
  tCat?: string | null,
  cUse?: string | null,
  cName?: string | null,
  cCat?: string | null
): { score: number; state: MatchState } {
  const tFamily = detectFunctionalFamily(tName, tCat, null, tUse);
  const cFamily = detectFunctionalFamily(cName, cCat, null, cUse);

  if (tFamily !== 'GENERAL_CRAFT' && cFamily !== 'GENERAL_CRAFT') {
    if (tFamily === cFamily) {
      return { score: 1.0, state: 'EXACT' };
    }

    // Related usage (e.g. Beverage Drinkware ↔ Food Tableware)
    if (
      (tFamily === 'BEVERAGE_DRINKWARE' && cFamily === 'FOOD_TABLEWARE') ||
      (tFamily === 'FOOD_TABLEWARE' && cFamily === 'BEVERAGE_DRINKWARE') ||
      (tFamily === 'WATER_VESSEL' && cFamily === 'BEVERAGE_DRINKWARE') ||
      (tFamily === 'STORAGE_CONTAINER' && cFamily === 'FOOD_TABLEWARE')
    ) {
      return { score: 0.40, state: 'PARTIAL' };
    }

    // Unrelated use (e.g. tableware vs decor or lighting)
    return { score: 0.0, state: 'DIFFERENT' };
  }

  return { score: 0.30, state: 'MISSING' };
}

export function evaluateCraftSimilarity(tCraft?: string | null, cCraft?: string | null): { score: number; state: MatchState } {
  const tStr = normalizeText(tCraft || '');
  const cStr = normalizeText(cCraft || '');

  if (!tStr || !cStr) return { score: 0, state: 'MISSING' };
  if (tStr === cStr) return { score: 1.0, state: 'EXACT' };

  const tTokens = extractTokens(tStr);
  const cTokens = extractTokens(cStr);

  const common = tTokens.filter((t) => cTokens.includes(t));
  if (common.length > 0) {
    return { score: 0.85, state: 'STRONG_RELATED' };
  }

  return { score: 0.30, state: 'PARTIAL' };
}

export function evaluateFeaturesSimilarity(tFeats?: string[] | null, cFeats?: string[] | null): { score: number; state: MatchState } {
  const tf = (tFeats || []).map(normalizeText).filter(Boolean);
  const cf = (cFeats || []).map(normalizeText).filter(Boolean);

  if (tf.length === 0 || cf.length === 0) return { score: 0, state: 'MISSING' };

  const common = tf.filter((f) => cf.some((c) => c.includes(f) || f.includes(c)));
  if (common.length > 0) {
    const ratio = common.length / Math.max(tf.length, cf.length);
    return { score: Math.max(0.5, ratio), state: 'STRONG_RELATED' };
  }

  return { score: 0.0, state: 'DIFFERENT' };
}

export function evaluateSemanticSimilarity(tDesc?: string | null, cDesc?: string | null): { score: number; state: MatchState } {
  const tTokens = extractTokens(tDesc || '');
  const cTokens = extractTokens(cDesc || '');

  if (tTokens.length === 0 || cTokens.length === 0) return { score: 0, state: 'MISSING' };

  // Strip generic marketing words so they don't contribute
  const tFiltered = tTokens.filter((t) => !MATERIAL_MARKETING_STOP_WORDS.has(t));
  const cFiltered = cTokens.filter((t) => !MATERIAL_MARKETING_STOP_WORDS.has(t));

  if (tFiltered.length === 0 || cFiltered.length === 0) return { score: 0, state: 'MISSING' };

  const common = tFiltered.filter((t) => cFiltered.includes(t));
  const union = Array.from(new Set([...tFiltered, ...cFiltered]));

  const score = common.length / union.length;
  if (score >= 0.5) return { score, state: 'STRONG_RELATED' };
  if (score >= 0.2) return { score, state: 'PARTIAL' };
  return { score: 0.0, state: 'DIFFERENT' };
}

export function calculateProductSimilarity(
  target: TargetProductInput,
  candidate: RawCandidateProduct
): AttributeSimilarityResult {
  const profileKey = detectCategoryProfile(target.category || undefined, target.subcategory || undefined) as CategoryProfileKey;
  const baseWeights: AttributeWeights = CATEGORY_PROFILES[profileKey] || CATEGORY_PROFILES.GENERAL_FALLBACK;

  // 1. Product Type / Identity (28% base)
  const ptRes = evaluateProductTypeSimilarity(
    target.name, target.subcategory, target.productType,
    candidate.name, candidate.subcategory, candidate.product_type
  );

  // 2. Intended Use (16% base)
  const useRes = evaluateIntendedUseSimilarity(
    target.intendedUse, target.name, target.category,
    candidate.intended_use, candidate.name, candidate.category
  );

  // 3. Quantity / Physical Scale (20% base)
  const qtyRes = evaluateQuantitySimilarity(target.quantity, candidate.quantity || candidate.set_size);

  // 4. Material (16% base)
  const matRes = evaluateMaterialSimilarity(target.material, candidate.material);

  // 5. Craft Technique (10% base)
  const craftRes = evaluateCraftSimilarity(
    target.craftType || target.craftTechnique,
    candidate.craft_type || candidate.craft_technique
  );

  // 6. Features (7% base)
  const featRes = evaluateFeaturesSimilarity(target.features, candidate.features);

  // 7. Semantic (Capped at 3%)
  const semRes = evaluateSemanticSimilarity(
    `${target.name || ''} ${target.description || ''}`,
    `${candidate.name || ''} ${candidate.description || ''}`
  );

  const rawBreakdown: AttributeMatchBreakdown = {
    productType: { score: ptRes.score, state: ptRes.state, weight: baseWeights.productType },
    intendedUse: { score: useRes.score, state: useRes.state, weight: baseWeights.intendedUse },
    quantity: { score: qtyRes.score, state: qtyRes.state, weight: baseWeights.quantity },
    material: { score: matRes.score, state: matRes.state, weight: baseWeights.material },
    craft: { score: craftRes.score, state: craftRes.state, weight: baseWeights.craft },
    features: { score: featRes.score, state: featRes.state, weight: baseWeights.features },
    semantic: { score: semRes.score, state: semRes.state, weight: Math.min(baseWeights.semantic, PRICING_CONFIG.semanticWeightCap) },
  };

  const matchedAttributes: string[] = [];
  const differingAttributes: string[] = [];
  let availableWeightSum = 0;
  let weightedScoreSum = 0;
  let missingCount = 0;

  for (const [key, item] of Object.entries(rawBreakdown) as Array<[keyof AttributeMatchBreakdown, { score: number; state: MatchState; weight: number }]>) {
    if (item.state === 'MISSING') {
      missingCount++;
      // Exclude missing attribute weight from denominator (MISSING != DIFFERENT)
      continue;
    }

    availableWeightSum += item.weight;
    weightedScoreSum += item.score * item.weight;

    if (item.score >= 0.70) {
      matchedAttributes.push(key);
    } else {
      differingAttributes.push(key);
    }
  }

  let overallSimilarity = availableWeightSum > 0 ? weightedScoreSum / availableWeightSum : 0;

  // Material Guardrail: If materials are completely DIFFERENT (e.g. Clay vs Wood),
  // product cannot be considered a primary benchmark comparable (cap at 0.72)
  if (matRes.state === 'DIFFERENT') {
    overallSimilarity = Math.min(overallSimilarity, 0.72);
  }

  const roundedSim = Math.round(overallSimilarity * 100) / 100;

  return {
    overallSimilarity: roundedSim,
    breakdown: rawBreakdown,
    matchedAttributes,
    differingAttributes,
    missingCount,
  };
}
