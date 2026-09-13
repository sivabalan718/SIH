import { z } from 'zod';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getSupabaseAdmin } from '../../config/supabase.js';
import { getProductsByArtisan } from '../product.service.js';

export type PricingLanguage = 'en' | 'ta' | 'hi';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ProductionTimeUnit = 'hours' | 'days' | 'weeks';
export type DataTrustLevel = 'VERIFIED' | 'OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
export type SourceType = 'ARTISAN_INPUT' | 'M63_INTERNAL' | 'EXTERNAL_OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
export type CostState = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
export type PricingBasis = 'MARKET_SUPPORTED' | 'COST_ANCHORED';
export type MatchTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface SelectedComparableItem {
  productId: string;
  productName: string;
  price: number;
  similarityScore: number;
  similarityPercentage: number;
  finalSimilarityScore?: number;
  matchTier: MatchTier;
  matchTierLabel: string;
  matchedAttributes: string[];
  benchmark_eligible: boolean;
  is_outlier?: boolean;
  priceInfluenceLevel?: string;
  priceInfluenceExplanation?: string;
  priceInfluence?: string;
  influenceWeight?: number;
  functionalCompatibility?: string;
  exclusionReason?: string;
  imageUrl?: string;
}

export interface PricingDiagnosticAudit {
  totalCandidates: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  rejectedCount: number;
  benchmarkCandidateCount: number;
  outlierCount: number;
  retainedComparableCount: number;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  benchmarkPrice: number | null;
  pricingBasis: PricingBasis;
  selectedComparables: SelectedComparableItem[];
}

export type ConflictType =
  | 'MATERIAL_CONFLICT'
  | 'CATEGORY_CONFLICT'
  | 'CRAFT_CONFLICT'
  | 'PRODUCT_TYPE_CONFLICT'
  | 'NUMERIC_AMBIGUITY'
  | 'DESCRIPTION_ATTRIBUTE_CONFLICT';

export interface ProductConflict {
  type: ConflictType;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  field: string;
  description: string;
  recommendation: string;
}

export interface ProductFactValidationResult {
  has_conflicts: boolean;
  high_impact_conflict: boolean;
  conflicts: ProductConflict[];
  notice: string | null;
}

export interface ExtractedPricingFields {
  material_cost: number | null;
  labour_cost: number | null;
  other_expenses: number | null;
  production_time: number | null;
  production_time_unit: ProductionTimeUnit | null;
}

export interface VoiceExtractionResult {
  language: PricingLanguage;
  transcript: string;
  extracted: ExtractedPricingFields;
  confidence: ConfidenceLevel;
  ambiguous_fields: Array<{
    value: number;
    possible_fields: string[];
  }>;
  missing_fields: string[];
  needs_clarification: boolean;
  clarification_question: string | null;
}

export interface FairPricingInput {
  name?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  craft_type?: string;
  color?: string;
  features?: string[];
  dimensions?: string;
  weight?: string;
  customization_info?: string;
  existing_price?: number;

  // Pricing cost inputs
  material_cost?: number | null;
  labour_cost?: number | null;
  other_expenses?: number | null;
  production_time?: number | null;
  production_time_unit?: ProductionTimeUnit | null;
}

export interface EvidenceProvenanceItem {
  source_type: SourceType;
  trust_level: DataTrustLevel;
  description: string;
  value: string;
  source_reference: string;
}

export interface PricingEvidencePackage {
  production_economics: {
    material_cost: number | null;
    labour_cost: number | null;
    other_expenses: number | null;
    known_cost: number;
    cost_state: CostState;
    production_time: number | null;
    production_time_unit: ProductionTimeUnit | null;
  };
  product_context: {
    name: string;
    category: string;
    subcategory: string;
    material: string;
    craft_type: string;
    features: string[];
    existing_price: number | null;
  };
  product_validation: ProductFactValidationResult;
  marketplace_evidence: {
    total_candidate_count: number;
    relevant_comparable_count: number;
    high_relevance_count: number;
    tier3_count: number;
    outliers_excluded_count: number;
    observed_min_price: number | null;
    observed_max_price: number | null;
    observed_median_price: number | null;
    trimmed_median_price: number | null;
    category_activity: string;
    seasonal_signal: string;
    regional_demand: string;
    evidence_source_type: SourceType;
    pricing_basis: PricingBasis;
    selected_comparables: SelectedComparableItem[];
    diagnostics: PricingDiagnosticAudit;
  };
  data_trust_matrix: Record<string, DataTrustLevel>;
  evidence_provenance: Record<string, EvidenceProvenanceItem>;
}

export interface ReasoningFlowStep {
  step: number;
  title: string;
  summary: string;
  details: string[];
}

export interface ArtisanPriceComparison {
  artisan_price: number | null;
  suggested_price: number | null;
  position_status: 'below' | 'within' | 'above' | 'no_price';
  message: string;
}

export const PRICING_POLICY_CONFIG = {
  fairArtisanMarginRate: 0.55,
  eligibilitySimilarityThreshold: 0.50,
  marketAlignmentFactor: 0.40,
  craftFactors: {
    timeEffort: 0.05,
    premiumMaterial: 0.08,
    craftComplexity: 0.07,
  },
};

export interface CalculationBreakdown {
  known_production_cost: number | null;
  margin_rate: number;
  base_margin: number;
  cost_state: CostState;
  craft_factor: number;
  craft_adjustment: number;
  craft_factor_breakdown: string[];
  cost_based_price: number;
  total_candidates_count: number;
  eligible_comparable_count: number;
  contextual_excluded_count: number;
  weighted_market_price: number | null;
  market_evidence_adjustment: number;
  fair_minimum: number;
  suggested_price: number;
  fair_maximum: number;
  confidence: ConfidenceLevel;
  confidence_reason: string;
  mathematical_formula_str: string;
  market_evidence_weight_pct?: number;
  market_adjustment_explanation?: string;
  reconciliation_formula?: string;
  cost_floor_amount?: number;
  cost_anchor_amount?: number;
  fair_range_min_reason?: string;
  fair_range_max_reason?: string;

  // Backward compatibility fields
  material_factor_bonus?: number;
  labour_time_factor_bonus?: number;
  craft_complexity_factor_bonus?: number;
  total_attribute_bonuses: number;
  outlier_trimmed_comparable_prices?: number[];
  outlier_count?: number;
  benchmark_statistic_used?: 'TRIMMED_MEDIAN' | 'MEDIAN' | 'COST_BASELINE' | 'WEIGHTED_MARKET_REFERENCE';
  benchmark_price?: number | null;
  cost_based_minimum?: number;
}

export interface FairPriceRecommendation {
  fair_price_min: number | null;
  fair_price_max: number | null;
  suggested_price: number | null;
  confidence: ConfidenceLevel;
  known_cost: number;
  cost_state?: CostState;
  pricing_basis?: PricingBasis;
  product_validation?: ProductFactValidationResult;
  calculation_breakdown?: CalculationBreakdown;
  price_justification?: string;
  factors_considered: string[];
  selected_comparables?: SelectedComparableItem[];
  excluded_comparables?: Array<{
    productId: string;
    productName: string;
    price: number;
    rawSimilarity: number;
    functionalFamily: string;
    exclusionReason: string;
  }>;
  reconciliation_formula?: string;
  reconciliation_inputs?: {
    costAnchor: number;
    marketReference: number | null;
    alpha: number;
    adjustment: number;
  };
  reconciliation_explanation?: string;
  diagnostics?: PricingDiagnosticAudit;
  evidence_used: {
    comparable_count: number;
    relevant_comparable_count?: number;
    high_relevance_count?: number;
    outliers_excluded_count?: number;
    price_range_str: string;
    seasonal_signal: string;
    demand_signal: string;
    source_label: string;
  };
  data_availability: Record<string, string>;
  evidence_provenance?: Record<string, EvidenceProvenanceItem>;
  comparison_with_artisan_price: ArtisanPriceComparison;
  reasoning_flow: ReasoningFlowStep[];
  missing_information: string[];
  assumptions: string[];
}

// Zod Schemas for Runtime Validation
const voiceExtractionSchema = z.object({
  language: z.enum(['en', 'ta', 'hi']).default('en'),
  extracted: z.object({
    material_cost: z.number().nullable().default(null),
    labour_cost: z.number().nullable().default(null),
    other_expenses: z.number().nullable().default(null),
    production_time: z.number().nullable().default(null),
    production_time_unit: z.enum(['hours', 'days', 'weeks']).nullable().default(null),
  }),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  ambiguous_fields: z
    .array(
      z.object({
        value: z.number(),
        possible_fields: z.array(z.string()),
      })
    )
    .default([]),
  missing_fields: z.array(z.string()).default([]),
  needs_clarification: z.boolean().default(false),
  clarification_question: z.string().nullable().default(null),
});

const recommendationSchema = z.object({
  fair_price_min: z.number().nullable().default(null),
  fair_price_max: z.number().nullable().default(null),
  suggested_price: z.number().nullable().default(null),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  price_justification: z.string().default(''),
  factors_considered: z.array(z.string()).default([]),
  evidence_used: z.object({
    comparable_count: z.number().default(0),
    price_range_str: z.string().default('Unavailable'),
    seasonal_signal: z.string().default('Unavailable'),
    demand_signal: z.string().default('Unavailable'),
    source_label: z.string().default('Internal M63 Marketplace'),
  }).default({}),
  data_availability: z.record(z.string()).default({}),
  comparison_with_artisan_price: z.object({
    artisan_price: z.number().nullable().default(null),
    suggested_price: z.number().nullable().default(null),
    position_status: z.enum(['below', 'within', 'above', 'no_price']).default('no_price'),
    message: z.string().default(''),
  }).default({}),
  reasoning_flow: z.array(
    z.object({
      step: z.number(),
      title: z.string(),
      summary: z.string(),
      details: z.array(z.string()),
    })
  ).default([]),
  missing_information: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
});

/**
 * Multilingual Voice Extraction using Gemini Multimodal Audio API
 */
export async function extractPricingFromVoice(
  audioBuffer: Buffer,
  mimeType: string,
  language: PricingLanguage = 'en',
  browserTranscript?: string
): Promise<VoiceExtractionResult> {
  const apiKey = env.geminiApiKey;
  const audioBase64 = audioBuffer.toString('base64');
  let normalizedMimeType = mimeType || 'audio/webm';
  if (normalizedMimeType.includes('webm')) normalizedMimeType = 'audio/webm';
  else if (normalizedMimeType.includes('wav')) normalizedMimeType = 'audio/wav';
  else if (normalizedMimeType.includes('mp3') || normalizedMimeType.includes('mpeg')) normalizedMimeType = 'audio/mp3';
  else if (normalizedMimeType.includes('m4a')) normalizedMimeType = 'audio/m4a';
  else if (normalizedMimeType.includes('ogg')) normalizedMimeType = 'audio/ogg';

  const langInstructions: Record<PricingLanguage, string> = {
    en: 'English language',
    ta: 'Tamil (தமிழ்) language',
    hi: 'Hindi (हिन्दी) language',
  };

  const promptText = `You are the M63 Multilingual Voice Intelligence Engine for craft artisans.
Listen to this audio recording of an artisan speaking in ${langInstructions[language]}.
${browserTranscript ? `Additional reference browser transcript: "${browserTranscript}"` : ''}

TASK:
1. Transcribe the audio exact words spoken into "transcript".
2. Extract all pricing and production cost attributes mentioned in the speech:
   - material_cost (numeric amount in Rupees)
   - labour_cost (numeric amount in Rupees)
   - other_expenses (numeric amount in Rupees)
   - production_time (numeric count)
   - production_time_unit ("hours", "days", or "weeks")

CRITICAL AMBIGUITY RULES:
1. If the speaker mentions a number WITHOUT specifying what cost it belongs to (e.g. saying only "500" or "500 rupees"), DO NOT guess the field. Set all extracted fields to null, set needs_clarification to true, and add an entry in ambiguous_fields: {"value": 500, "possible_fields": ["material_cost", "labour_cost", "other_expenses"]}. Provide clarification_question in ${langInstructions[language]} (e.g. "I heard ₹500. What does this amount represent?").
2. Single recordings CAN contain multiple clear attributes (e.g. "Material 500, labour 300, 3 days"). Extract all clearly stated fields.

Return ONLY valid JSON matching this schema:
{
  "language": "${language}",
  "transcript": "Exact spoken text",
  "extracted": {
    "material_cost": 500 | null,
    "labour_cost": 300 | null,
    "other_expenses": 100 | null,
    "production_time": 3 | null,
    "production_time_unit": "days" | "hours" | "weeks" | null
  },
  "confidence": "high" | "medium" | "low",
  "ambiguous_fields": [],
  "missing_fields": ["labour_cost", "other_expenses"],
  "needs_clarification": false,
  "clarification_question": null
}`;

  if (!apiKey) {
    logger.warn('[PricingIntelligence] Gemini API key not configured; using heuristic speech extractor');
    return heuristicExtractFromText(browserTranscript || '', language);
  }

  const modelsToTry = [
    'gemini-3.5-flash-lite',
    env.geminiTranscriptionModel || 'gemini-3.5-transcribe',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
  ];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: { mimeType: normalizedMimeType, data: audioBase64 },
                },
                { text: promptText },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.warn(`[PricingIntelligence] Model ${model} returned error ${response.status}: ${errText}`);
        continue;
      }

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const validated = voiceExtractionSchema.parse(parsed);

      return {
        ...validated,
        transcript: parsed.transcript || browserTranscript || 'Spoken cost input',
      } as VoiceExtractionResult;
    } catch (e: any) {
      logger.warn(`[PricingIntelligence] Voice extraction via ${model} failed: ${e?.message}`);
    }
  }

  return heuristicExtractFromText(browserTranscript || '', language);
}

/**
 * Heuristic Extractor from Text for Fallback / Offline Dev
 */
function heuristicExtractFromText(text: string, language: PricingLanguage): VoiceExtractionResult {
  const lower = text.toLowerCase();
  const extracted: ExtractedPricingFields = {
    material_cost: null,
    labour_cost: null,
    other_expenses: null,
    production_time: null,
    production_time_unit: null,
  };

  const numbers = (text.match(/\d+/g) || []).map(Number);

  if (
    numbers.length === 1 &&
    !lower.includes('material') &&
    !lower.includes('labour') &&
    !lower.includes('other') &&
    !lower.includes('மூலப்பொருள்') &&
    !lower.includes('கூலி') &&
    !lower.includes('सामग्री') &&
    !lower.includes('मजबूरी')
  ) {
    const questionMap: Record<PricingLanguage, string> = {
      en: `I heard ₹${numbers[0]}. What does this amount represent?`,
      ta: `நான் ₹${numbers[0]} என உணர்ந்தேன். இந்தத் தொகை எதனைக் குறிக்கிறது?`,
      hi: `मैंने ₹${numbers[0]} सुना। यह राशि किस लागत को दर्शाती है?`,
    };
    return {
      language,
      transcript: text || `₹${numbers[0]}`,
      extracted,
      confidence: 'low',
      ambiguous_fields: [{ value: numbers[0], possible_fields: ['material_cost', 'labour_cost', 'other_expenses'] }],
      missing_fields: ['material_cost', 'labour_cost', 'other_expenses', 'production_time'],
      needs_clarification: true,
      clarification_question: questionMap[language],
    };
  }

  const matMatch = text.match(/(?:material|மூலப்பொருள்|सामग्री)[^\d]*(\d+)/i);
  if (matMatch) extracted.material_cost = Number(matMatch[1]);

  const labMatch = text.match(/(?:labour|labor|கூலி|தொழிலாளர்|मजबूरी|श्रम)[^\d]*(\d+)/i);
  if (labMatch) extracted.labour_cost = Number(labMatch[1]);

  const othMatch = text.match(/(?:other|expenses|இதர|சுமை|अन्य|खर्च)[^\d]*(\d+)/i);
  if (othMatch) extracted.other_expenses = Number(othMatch[1]);

  const timeMatch = text.match(/(\d+)\s*(hour|hours|day|days|week|weeks|மணி|நாள்|வாரம்|घंटे|दिन|हफ्ते)/i);
  if (timeMatch) {
    extracted.production_time = Number(timeMatch[1]);
    const unitStr = timeMatch[2].toLowerCase();
    if (unitStr.includes('hour') || unitStr.includes('மணி') || unitStr.includes('घंटे')) extracted.production_time_unit = 'hours';
    else if (unitStr.includes('week') || unitStr.includes('வாரம்') || unitStr.includes('हफ्ते')) extracted.production_time_unit = 'weeks';
    else extracted.production_time_unit = 'days';
  }

  const missing: string[] = [];
  if (extracted.material_cost === null) missing.push('material_cost');
  if (extracted.labour_cost === null) missing.push('labour_cost');
  if (extracted.other_expenses === null) missing.push('other_expenses');
  if (extracted.production_time === null) missing.push('production_time');

  return {
    language,
    transcript: text || 'Voice input recorded',
    extracted,
    confidence: missing.length > 2 ? 'low' : missing.length > 0 ? 'medium' : 'high',
    ambiguous_fields: [],
    missing_fields: missing,
    needs_clarification: false,
    clarification_question: null,
  };
}

/**
 * Product Fact Consistency Gate (Phase 1)
 * Validates internal consistency of product data before pricing.
 */
export function validateProductFacts(input: FairPricingInput): ProductFactValidationResult {
  const conflicts: ProductConflict[] = [];

  const nameLower = (input.name || '').toLowerCase();
  const descLower =
    (input.features || []).join(' ').toLowerCase() +
    ' ' +
    (input.customization_info || '').toLowerCase();
  const matLower = (input.material || '').toLowerCase();
  const craftLower = (input.craft_type || '').toLowerCase();
  const catLower = (input.category || '').toLowerCase();

  // 1. MATERIAL_CONFLICT: Stored material vs description contradiction
  if (
    matLower.includes('cotton') &&
    (descLower.includes('polyester') || descLower.includes('nylon') || descLower.includes('synthetic fabric'))
  ) {
    conflicts.push({
      type: 'MATERIAL_CONFLICT',
      severity: 'HIGH',
      field: 'material',
      description: `Stored material is "${input.material}", but description specifies synthetic polyester fabric.`,
      recommendation: 'Verify whether the product is 100% natural cotton or a synthetic fabric.',
    });
  } else if (
    matLower.includes('silk') &&
    (descLower.includes('polyester') || descLower.includes('acrylic') || descLower.includes('cotton blend'))
  ) {
    conflicts.push({
      type: 'MATERIAL_CONFLICT',
      severity: 'HIGH',
      field: 'material',
      description: `Stored material is "${input.material}", but description specifies a non-pure silk blend.`,
      recommendation: 'Verify pure silk vs synthetic blend composition.',
    });
  }

  // 2. PRODUCT_TYPE_CONFLICT: Commercial mass items / sports jerseys under craft handloom
  if (
    nameLower.includes('jersey') ||
    nameLower.includes('t-shirt') ||
    nameLower.includes('nike') ||
    nameLower.includes('adidas') ||
    nameLower.includes('virat kohli')
  ) {
    if (craftLower.includes('weaving') || craftLower.includes('handloom') || catLower.includes('handloom')) {
      conflicts.push({
        type: 'PRODUCT_TYPE_CONFLICT',
        severity: 'HIGH',
        field: 'craft_type',
        description: `Product "${input.name}" appears to be commercial apparel rather than traditional handloom craft.`,
        recommendation: 'Confirm whether this item is a genuine artisan handloom craft before generating pricing.',
      });
    }
  }

  // 3. CATEGORY_CONFLICT: Product name indicates category different from stored category
  if (
    (nameLower.includes('necklace') || nameLower.includes('jhumka') || nameLower.includes('earring')) &&
    !catLower.includes('jewel') &&
    !catLower.includes('metal')
  ) {
    conflicts.push({
      type: 'CATEGORY_CONFLICT',
      severity: 'MEDIUM',
      field: 'category',
      description: `Product name "${input.name}" indicates jewellery, but category is stored as "${input.category}".`,
      recommendation: 'Update category to Jewellery & Metalware for accurate comparables.',
    });
  } else if (
    (nameLower.includes('saree') || nameLower.includes('shawl') || nameLower.includes('dupatta')) &&
    !catLower.includes('textile') &&
    !catLower.includes('apparel')
  ) {
    conflicts.push({
      type: 'CATEGORY_CONFLICT',
      severity: 'MEDIUM',
      field: 'category',
      description: `Product name "${input.name}" indicates handloom textile, but category is "${input.category}".`,
      recommendation: 'Update category to Textiles & Handlooms.',
    });
  }

  // 4. CRAFT_CONFLICT: Incompatible material and craft technique
  if (matLower.includes('clay') && craftLower.includes('wood carving')) {
    conflicts.push({
      type: 'CRAFT_CONFLICT',
      severity: 'HIGH',
      field: 'craft_type',
      description: `Material "${input.material}" cannot be processed with craft technique "${input.craft_type}".`,
      recommendation: 'Correct craft technique to Wheel Pottery or Terracotta Molding.',
    });
  } else if (matLower.includes('silk') && craftLower.includes('pottery')) {
    conflicts.push({
      type: 'CRAFT_CONFLICT',
      severity: 'HIGH',
      field: 'craft_type',
      description: `Material "${input.material}" cannot be processed with craft technique "${input.craft_type}".`,
      recommendation: 'Correct craft technique to Handloom Weaving or Embroidery.',
    });
  }

  // 5. NUMERIC_AMBIGUITY: Negative cost values
  if (
    (input.material_cost !== null && input.material_cost !== undefined && input.material_cost < 0) ||
    (input.labour_cost !== null && input.labour_cost !== undefined && input.labour_cost < 0) ||
    (input.other_expenses !== null && input.other_expenses !== undefined && input.other_expenses < 0)
  ) {
    conflicts.push({
      type: 'NUMERIC_AMBIGUITY',
      severity: 'HIGH',
      field: 'production_economics',
      description: 'Recorded production cost components contain invalid negative amounts.',
      recommendation: 'Ensure all production cost values are positive or zero.',
    });
  }

  const highImpact = conflicts.some((c) => c.severity === 'HIGH');
  const hasConflicts = conflicts.length > 0;
  const notice = hasConflicts
    ? 'Some product details appear inconsistent. Please verify the highlighted information before generating a fair-price recommendation.'
    : null;

  return {
    has_conflicts: hasConflicts,
    high_impact_conflict: highImpact,
    conflicts,
    notice,
  };
}

/**
 * Helper to calculate robust median and IQR outlier trimming
 */
function calculateRobustStats(prices: number[]) {
  if (prices.length === 0) {
    return {
      min: null,
      max: null,
      median: null,
      trimmedMedian: null,
      q1: null,
      q3: null,
      iqr: null,
      outliersCount: 0,
      cleanPrices: [],
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];

  // IQR Trimming for sample size >= 4
  if (sorted.length >= 4) {
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = Math.max(0, q1 - 1.5 * iqr);
    const upperBound = q3 + 1.5 * iqr;

    const cleanPrices = sorted.filter((p) => p >= lowerBound && p <= upperBound);
    const outliersCount = sorted.length - cleanPrices.length;

    const trimmedMedian = cleanPrices.length > 0 ? cleanPrices[Math.floor(cleanPrices.length / 2)] : median;

    return {
      min: cleanPrices.length > 0 ? cleanPrices[0] : min,
      max: cleanPrices.length > 0 ? cleanPrices[cleanPrices.length - 1] : max,
      median,
      trimmedMedian,
      q1,
      q3,
      iqr,
      outliersCount,
      cleanPrices,
    };
  }

  return {
    min,
    max,
    median,
    trimmedMedian: median,
    q1: null,
    q3: null,
    iqr: null,
    outliersCount: 0,
    cleanPrices: sorted,
  };
}

/**
 * Configurable weights for Product-Level Hybrid Deterministic Similarity Engine
 */
export const SIMILARITY_WEIGHTS = {
  category: 0.20,
  subcategory: 0.20,
  productType: 0.20,
  material: 0.15,
  craft: 0.10,
  description: 0.10,
  features: 0.05,
};

const DOMAIN_STOP_WORDS = new Set([
  'beautiful', 'premium', 'quality', 'best', 'unique', 'elegant', 'traditional',
  'authentic', 'genuine', 'pure', 'fine', 'exclusive', 'luxury', 'stylish',
  'modern', 'classic', 'original', 'high', 'handcrafted', 'handmade', 'craft',
  'item', 'product', 'buy', 'shop', 'online', 'special', 'superb', 'fresh', 'excellent'
]);

const DOMAIN_SYNONYMS: Record<string, string> = {
  'jewellery': 'jewellery',
  'jewelry': 'jewellery',
  'block printed': 'blockprint',
  'block-print': 'blockprint',
  'block printing': 'blockprint',
  'blockprint': 'blockprint',
  'cottons': 'cotton',
  'kurtas': 'kurta',
  'sarees': 'saree',
  'shawls': 'shawl',
  'dupattas': 'dupatta',
  'earrings': 'earring',
  'ear ring': 'earring',
  'jhumka': 'earring',
  'jhumkas': 'earring',
  'necklace': 'necklace',
  'necklaces': 'necklace',
  'handloom weaving': 'weaving',
  'hand woven': 'weaving',
  'handloom': 'weaving',
  'woven': 'weaving',
  'terracotta': 'terracotta',
  'pottery': 'pottery',
  'earthenware': 'pottery',
  'clay': 'clay',
};

export function normalizeDomainText(text: string): string[] {
  if (!text) return [];
  let clean = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ');

  // Phrase synonym replacements
  clean = clean
    .replace(/block[\s-_]*print(ed|ing)?/g, 'blockprint')
    .replace(/hand[\s-_]*woven/g, 'weaving')
    .replace(/hand[\s-_]*loom/g, 'weaving')
    .replace(/ear[\s-_]*ring(s)?/g, 'earring');

  clean = clean.replace(/[-_]/g, ' ');

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const result: string[] = [];

  for (const tok of rawTokens) {
    if (DOMAIN_STOP_WORDS.has(tok)) continue;
    const syn = DOMAIN_SYNONYMS[tok] || tok;
    if (syn && syn.length > 1) {
      result.push(syn);
    }
  }

  return Array.from(new Set(result));
}

const PRODUCT_TYPE_PATTERNS: Array<{ type: string; keywords: string[] }> = [
  { type: 'kurta', keywords: ['kurta', 'kurtas', 'tunic'] },
  { type: 'saree', keywords: ['saree', 'sari', 'sarees'] },
  { type: 'shawl', keywords: ['shawl', 'shawls', 'stole', 'stoles', 'wrap'] },
  { type: 'dupatta', keywords: ['dupatta', 'dupattas', 'chunri'] },
  { type: 'necklace', keywords: ['necklace', 'necklaces', 'pendant', 'choker', 'haar'] },
  { type: 'earring', keywords: ['earring', 'earrings', 'jhumka', 'jhumkas', 'studs'] },
  { type: 'bracelet', keywords: ['bracelet', 'bangle', 'bangles', 'cuff'] },
  { type: 'basket', keywords: ['basket', 'basketry', 'storage basket', 'box'] },
  { type: 'pitcher', keywords: ['pitcher', 'jug', 'water pitcher', 'kulhad'] },
  { type: 'vase', keywords: ['vase', 'pottery vase', 'flower pot'] },
  { type: 'bowl', keywords: ['bowl', 'bowls', 'serving bowl', 'urlu'] },
  { type: 'plate', keywords: ['plate', 'serving plate', 'thali', 'wall plate'] },
  { type: 'painting', keywords: ['painting', 'tanjore', 'wall art', 'canvas'] },
  { type: 'sculpture', keywords: ['sculpture', 'statue', 'idol', 'figurine', 'nataraja'] },
  { type: 'lamp', keywords: ['lamp', 'diya', 'diyas', 'oil lamp', 'burner'] },
  { type: 'panel', keywords: ['panel', 'wall panel', 'carving panel'] },
  { type: 'bag', keywords: ['bag', 'tote', 'handbag', 'clutch'] },
];

export function extractProductType(text: string, subcategory?: string): string {
  const combined = ((text || '') + ' ' + (subcategory || '')).toLowerCase();
  for (const pattern of PRODUCT_TYPE_PATTERNS) {
    if (pattern.keywords.some((kw) => combined.includes(kw))) {
      return pattern.type;
    }
  }
  return subcategory ? subcategory.toLowerCase().trim() : 'general_craft';
}

export function calculateProductSimilarity(
  target: { name?: string; category?: string; subcategory?: string; material?: string; craft_type?: string; features?: string[]; description?: string },
  candidate: { id?: string; name?: string; category?: string; subcategory?: string; material?: string; craft_type?: string; features?: string[]; description?: string; price: number }
): { score: number; matchedAttributes: string[] } {
  const matchedAttributes: string[] = [];

  // 1. Category Score (20%)
  const targetCat = (target.category || '').toLowerCase().trim();
  const candCat = (candidate.category || '').toLowerCase().trim();
  let catScore = 0;
  if (targetCat && candCat && targetCat === candCat) {
    catScore = 1.0;
    matchedAttributes.push('category');
  }

  // 2. Subcategory Score (20%)
  const targetSubcat = (target.subcategory || '').toLowerCase().trim();
  const candSubcat = (candidate.subcategory || '').toLowerCase().trim();
  let subcatScore = 0;
  if (targetSubcat && candSubcat) {
    if (targetSubcat === candSubcat) {
      subcatScore = 1.0;
      matchedAttributes.push('subcategory');
    } else if (targetSubcat.includes(candSubcat) || candSubcat.includes(targetSubcat)) {
      subcatScore = 0.5;
      matchedAttributes.push('subcategory');
    }
  }

  // 3. Product Type Score (20%)
  const targetType = extractProductType(target.name || '', target.subcategory);
  const candType = extractProductType(candidate.name || '', candidate.subcategory);
  let typeScore = 0;
  if (targetType !== 'general_craft' && candType !== 'general_craft') {
    if (targetType === candType) {
      typeScore = 1.0;
      matchedAttributes.push('productType');
    } else {
      typeScore = 0.0; // Distinct product types get 0
    }
  } else {
    typeScore = 0.3;
  }

  // 4. Material Score (15%)
  const targetMat = (target.material || '').toLowerCase().trim();
  const candMat = (candidate.material || '').toLowerCase().trim();
  let matScore = 0;
  if (targetMat && candMat) {
    const tMatTokens = normalizeDomainText(targetMat);
    const cMatTokens = normalizeDomainText(candMat);
    const matIntersection = tMatTokens.filter((t) => cMatTokens.includes(t));
    if (matIntersection.length > 0) {
      matScore = matIntersection.length === Math.max(tMatTokens.length, cMatTokens.length) ? 1.0 : 0.6;
      matchedAttributes.push('material');
    }
  }

  // 5. Craft Score (10%)
  const targetCraft = (target.craft_type || '').toLowerCase().trim();
  const candCraft = (candidate.craft_type || '').toLowerCase().trim();
  let craftScore = 0;
  if (targetCraft && candCraft) {
    const tCraftTokens = normalizeDomainText(targetCraft);
    const cCraftTokens = normalizeDomainText(candCraft);
    const craftIntersection = tCraftTokens.filter((t) => cCraftTokens.includes(t));
    if (craftIntersection.length > 0) {
      craftScore = craftIntersection.length === Math.max(tCraftTokens.length, cCraftTokens.length) ? 1.0 : 0.6;
      matchedAttributes.push('craft');
    }
  }

  // 6. Description Term Similarity (10%)
  const targetDescStr = (target.name || '') + ' ' + (target.description || '') + ' ' + (target.features || []).join(' ');
  const candDescStr = (candidate.name || '') + ' ' + (candidate.description || '') + ' ' + (candidate.features || []).join(' ');
  const tTokens = normalizeDomainText(targetDescStr);
  const cTokens = normalizeDomainText(candDescStr);

  let descScore = 0;
  if (tTokens.length > 0 && cTokens.length > 0) {
    const commonTokens = tTokens.filter((t) => cTokens.includes(t));
    const unionTokens = Array.from(new Set([...tTokens, ...cTokens]));
    descScore = commonTokens.length / unionTokens.length;
    if (commonTokens.length >= 2) {
      matchedAttributes.push('descriptionTerms');
    }
  }

  // 7. Feature Term Similarity (5%)
  const tFeats = normalizeDomainText((target.features || []).join(' '));
  const cFeats = normalizeDomainText((candidate.features || []).join(' '));
  let featScore = 0;
  if (tFeats.length > 0 && cFeats.length > 0) {
    const commonFeats = tFeats.filter((t) => cFeats.includes(t));
    featScore = commonFeats.length / Math.max(tFeats.length, cFeats.length);
    if (commonFeats.length > 0) {
      matchedAttributes.push('features');
    }
  }

  const finalScore =
    SIMILARITY_WEIGHTS.category * catScore +
    SIMILARITY_WEIGHTS.subcategory * subcatScore +
    SIMILARITY_WEIGHTS.productType * typeScore +
    SIMILARITY_WEIGHTS.material * matScore +
    SIMILARITY_WEIGHTS.craft * craftScore +
    SIMILARITY_WEIGHTS.description * descScore +
    SIMILARITY_WEIGHTS.features * featScore;

  const scoreRounded = Math.round(finalScore * 100) / 100;
  const uniqueMatchedAttrs = Array.from(new Set(matchedAttributes));

  return {
    score: scoreRounded,
    matchedAttributes: uniqueMatchedAttrs,
  };
}

/**
 * Build Pricing Evidence Package from M63 Marketplace & Verified Artisan Inputs
 */
async function buildPricingEvidencePackage(input: FairPricingInput): Promise<PricingEvidencePackage> {
  // Validate Product Facts
  const productValidation = validateProductFacts(input);

  // Production Economics & Cost State
  const matCost = input.material_cost !== undefined && input.material_cost !== null ? Math.max(0, input.material_cost) : null;
  const labCost = input.labour_cost !== undefined && input.labour_cost !== null ? Math.max(0, input.labour_cost) : null;
  const othCost = input.other_expenses !== undefined && input.other_expenses !== null ? Math.max(0, input.other_expenses) : null;

  let costState: CostState = 'UNAVAILABLE';
  if (matCost !== null && labCost !== null && othCost !== null) {
    costState = 'COMPLETE';
  } else if (matCost !== null || labCost !== null || othCost !== null) {
    costState = 'PARTIAL';
  } else {
    costState = 'UNAVAILABLE';
  }

  const knownCost = (matCost || 0) + (labCost || 0) + (othCost || 0);

  // Fetch ALL candidate products from published catalogue (Do NOT filter by category alone!)
  let rawProducts: Array<{ id?: string; name: string; category: string; subcategory?: string; material?: string; craft_type?: string; features?: string[]; description?: string; price: number }> = [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, subcategory, material, craft_type, features, description, price')
      .eq('status', 'PUBLISHED')
      .limit(250);

    if (!error && data) {
      rawProducts = data.filter((p: any) => typeof p.price === 'number' && p.price > 0).map((p: any) => ({
        id: p.id,
        name: p.name || 'Craft Product',
        category: p.category || '',
        subcategory: p.subcategory || '',
        material: p.material || '',
        craft_type: p.craft_type || '',
        features: Array.isArray(p.features) ? p.features : [],
        description: p.description || '',
        price: p.price,
      }));
    }
  } catch (e) {}

  try {
    const memProds = await getProductsByArtisan('all');
    const memList = memProds
      .filter((p) => p.status === 'PUBLISHED' && p.price > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || '',
        subcategory: p.subcategory || '',
        material: p.material || '',
        craft_type: p.craft_type || '',
        features: p.features || [],
        description: p.description || '',
        price: p.price,
      }));
    rawProducts = [...rawProducts, ...memList];
  } catch (e) {}

  // Deduplicate candidates
  const seenMap = new Map<string, typeof rawProducts[0]>();
  for (const p of rawProducts) {
    const key = (p.id || p.name) + '-' + p.price;
    if (!seenMap.has(key)) {
      seenMap.set(key, p);
    }
  }
  const candidateList = Array.from(seenMap.values());

  // Evaluate Product-Level Hybrid Similarity for every candidate
  const tier1Items: SelectedComparableItem[] = [];
  const tier2Items: SelectedComparableItem[] = [];
  const tier3Items: SelectedComparableItem[] = [];
  let rejectedCount = 0;

  const targetCatLower = (input.category || '').toLowerCase().trim();
  const targetSubcatLower = (input.subcategory || '').toLowerCase().trim();
  const targetType = extractProductType(input.name || '', input.subcategory);

  for (const cand of candidateList) {
    const simRes = calculateProductSimilarity(input, cand);
    const score = simRes.score;

    if (score < 0.35) {
      rejectedCount++;
      continue; // REJECT candidate completely below 0.35
    }

    const candCatLower = (cand.category || '').toLowerCase().trim();
    const candSubcatLower = (cand.subcategory || '').toLowerCase().trim();
    const candType = extractProductType(cand.name || '', cand.subcategory);

    const isCatMatch = targetCatLower.length > 0 && candCatLower === targetCatLower;
    const isSubcatMatch = targetSubcatLower.length > 0 && (candSubcatLower === targetSubcatLower || candSubcatLower.includes(targetSubcatLower) || targetSubcatLower.includes(candSubcatLower));
    const isTypeMatch = targetType !== 'general_craft' && candType === targetType;

    const isEligible = score >= PRICING_POLICY_CONFIG.eligibilitySimilarityThreshold;

    let matchTier: MatchTier = 'TIER_3';
    let matchTierLabel = isEligible ? 'USED FOR PRICING' : 'CONTEXTUAL ONLY — NOT USED FOR PRICING';

    if (score >= 0.70) {
      matchTier = 'TIER_1';
    } else if (score >= 0.50) {
      matchTier = 'TIER_2';
    } else {
      matchTier = 'TIER_3';
    }

    const item: SelectedComparableItem = {
      productId: cand.id || `prod-cand-${Math.random().toString(36).substring(2, 7)}`,
      productName: cand.name,
      price: cand.price,
      similarityScore: score,
      similarityPercentage: Math.round(score * 100),
      matchTier,
      matchTierLabel,
      matchedAttributes: simRes.matchedAttributes,
      benchmark_eligible: isEligible,
      is_outlier: false,
    };

    if (matchTier === 'TIER_1') {
      tier1Items.push(item);
    } else if (matchTier === 'TIER_2') {
      tier2Items.push(item);
    } else {
      tier3Items.push(item);
    }
  }

  // Sort comparables deterministically by similarityScore descending, then matchTier priority
  const sortComp = (a: SelectedComparableItem, b: SelectedComparableItem) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return a.productName.localeCompare(b.productName);
  };

  tier1Items.sort(sortComp);
  tier2Items.sort(sortComp);
  tier3Items.sort(sortComp);

  const selectedComparables = [...tier1Items, ...tier2Items, ...tier3Items];

  // Primary pricing benchmark derived exclusively from TIER 1 & TIER 2 comparables! TIER 3 MUST NOT influence primary benchmark!
  const benchmarkCandidates = [...tier1Items, ...tier2Items];
  const benchmarkPrices = benchmarkCandidates.map((c) => c.price);

  let pricingBasis: PricingBasis = 'COST_ANCHORED';
  if (benchmarkPrices.length > 0) {
    pricingBasis = 'MARKET_SUPPORTED';
  } else {
    pricingBasis = 'COST_ANCHORED';
  }

  const stats = calculateRobustStats(benchmarkPrices);

  const diagnostics: PricingDiagnosticAudit = {
    totalCandidates: candidateList.length,
    tier1Count: tier1Items.length,
    tier2Count: tier2Items.length,
    tier3Count: tier3Items.length,
    rejectedCount,
    benchmarkCandidateCount: benchmarkCandidates.length,
    outlierCount: stats.outliersCount,
    retainedComparableCount: stats.cleanPrices.length,
    q1: stats.q1,
    q3: stats.q3,
    iqr: stats.iqr,
    benchmarkPrice: stats.trimmedMedian || stats.median,
    pricingBasis,
    selectedComparables,
  };

  const evidenceSourceType: SourceType = pricingBasis === 'MARKET_SUPPORTED' ? 'M63_INTERNAL' : 'UNAVAILABLE';
  const categoryName = input.category || 'Crafts';
  const nameLower = (input.name || '').toLowerCase();
  const catTarget = (input.category || '').toLowerCase();
  const isFestivalCraft =
    nameLower.includes('diya') ||
    nameLower.includes('lamp') ||
    nameLower.includes('puja') ||
    nameLower.includes('saree') ||
    nameLower.includes('silk') ||
    nameLower.includes('festive') ||
    catTarget.includes('textile') ||
    catTarget.includes('jewel');

  // Trust Matrix Logic
  const dataTrustMatrix: Record<string, DataTrustLevel> = {
    production_cost: costState === 'COMPLETE' ? 'VERIFIED' : costState === 'PARTIAL' ? 'INFERRED' : 'UNAVAILABLE',
    product_information: input.name || input.category ? 'VERIFIED' : 'UNAVAILABLE',
    internal_m63_comparables: pricingBasis === 'MARKET_SUPPORTED' ? 'OBSERVED' : 'UNAVAILABLE',
    external_market_evidence: 'UNAVAILABLE',
    seasonal_relevance: 'INFERRED',
    seasonal_demand: 'UNAVAILABLE',
  };

  const evidenceProvenances: Record<string, EvidenceProvenanceItem> = {
    production_cost: {
      source_type: costState !== 'UNAVAILABLE' ? 'ARTISAN_INPUT' : 'UNAVAILABLE',
      trust_level: costState === 'COMPLETE' ? 'VERIFIED' : costState === 'PARTIAL' ? 'INFERRED' : 'UNAVAILABLE',
      description: costState === 'COMPLETE' ? 'Complete cost details provided directly by artisan' : costState === 'PARTIAL' ? 'Partial production cost breakdown provided by artisan' : 'No cost breakdown provided',
      value: knownCost > 0 ? `₹${knownCost.toLocaleString('en-IN')}` : 'Unavailable',
      source_reference: 'Artisan Cost Entry',
    },
    product_information: {
      source_type: input.name || input.category ? 'ARTISAN_INPUT' : 'UNAVAILABLE',
      trust_level: input.name || input.category ? 'VERIFIED' : 'UNAVAILABLE',
      description: 'Product identity, category, and material specifications',
      value: `${input.name || 'Craft Item'} (${categoryName})`,
      source_reference: 'Artisan Product Listing',
    },
    internal_m63_comparables: {
      source_type: pricingBasis === 'MARKET_SUPPORTED' ? 'M63_INTERNAL' : 'UNAVAILABLE',
      trust_level: pricingBasis === 'MARKET_SUPPORTED' ? 'OBSERVED' : 'UNAVAILABLE',
      description: pricingBasis === 'MARKET_SUPPORTED'
        ? `${benchmarkCandidates.length} relevant comparables in internal M63 catalogue (${tier1Items.length} highly relevant Tier 1)`
        : 'Internal comparable evidence unavailable for this specific product configuration.',
      value: stats.median ? `₹${stats.min}–₹${stats.max} (Median ₹${stats.trimmedMedian || stats.median})` : 'Unavailable',
      source_reference: pricingBasis === 'MARKET_SUPPORTED' ? 'Internal M63 Marketplace Database' : 'N/A',
    },
    external_market_evidence: {
      source_type: 'UNAVAILABLE',
      trust_level: 'UNAVAILABLE',
      description: 'External independent marketplace competitor prices',
      value: 'Unavailable',
      source_reference: 'No external market API connected',
    },
    seasonal_relevance: {
      source_type: 'INFERRED',
      trust_level: 'INFERRED',
      description: 'Seasonal relevance inferred from category-level festival association',
      value: isFestivalCraft ? 'High seasonal festival/wedding relevance inferred' : 'Standard year-round craft',
      source_reference: 'Product Category & Features Analysis',
    },
    seasonal_demand: {
      source_type: 'UNAVAILABLE',
      trust_level: 'UNAVAILABLE',
      description: 'Live seasonal demand statistics',
      value: 'Unavailable',
      source_reference: 'N/A',
    },
  };

  return {
    production_economics: {
      material_cost: matCost,
      labour_cost: labCost,
      other_expenses: othCost,
      known_cost: knownCost,
      cost_state: costState,
      production_time: input.production_time || null,
      production_time_unit: input.production_time_unit || 'days',
    },
    product_context: {
      name: input.name || 'Handcrafted Craft',
      category: categoryName,
      subcategory: input.subcategory || '',
      material: input.material || 'Artisan Material',
      craft_type: input.craft_type || 'Handicraft',
      features: input.features || [],
      existing_price: input.existing_price || null,
    },
    product_validation: productValidation,
    marketplace_evidence: {
      total_candidate_count: candidateList.length,
      relevant_comparable_count: benchmarkCandidates.length,
      high_relevance_count: tier1Items.length,
      tier3_count: tier3Items.length,
      outliers_excluded_count: stats.outliersCount,
      observed_min_price: stats.min,
      observed_max_price: stats.max,
      observed_median_price: stats.median,
      trimmed_median_price: stats.trimmedMedian,
      category_activity: pricingBasis === 'MARKET_SUPPORTED' ? `${benchmarkCandidates.length} relevant items active in M63 catalogue` : 'Internal comparable evidence unavailable.',
      seasonal_signal: isFestivalCraft ? 'Seasonal craft relevance inferred' : 'Standard year-round craft',
      regional_demand: 'Current regional demand data unavailable',
      evidence_source_type: evidenceSourceType,
      pricing_basis: pricingBasis,
      selected_comparables: selectedComparables,
      diagnostics,
    },
    data_trust_matrix: dataTrustMatrix,
    evidence_provenance: evidenceProvenances,
  };
}

/**
 * AI-Powered Smart Fair Price Recommendation using Gemini with Strict Backend Safety Rules
 */
import { executePricingEngine } from '../pricing/pricingEngine.js';

/**
 * AI-Powered Smart Fair Price Recommendation using Deterministic Pricing Engine v1.0
 */
export async function generateFairPriceRecommendation(
  input: FairPricingInput,
  language: PricingLanguage = 'en'
): Promise<FairPriceRecommendation> {
  const result = await executePricingEngine(
    {
      productId: (input as any).productId || (input as any).id,
      name: input.name,
      category: input.category,
      subcategory: input.subcategory,
      material: input.material,
      craftType: input.craft_type,
      features: input.features,
      existingPrice: input.existing_price,
      materialCost: input.material_cost,
      labourCost: input.labour_cost,
      otherExpenses: input.other_expenses,
      productionTime: input.production_time,
      productionTimeUnit: input.production_time_unit,
    },
    language
  );

  const confLevel = (result.confidence.level.toLowerCase() as ConfidenceLevel);

  const selectedComparablesLegacy: SelectedComparableItem[] = result.marketReference.selectedComparables.map((c) => ({
    productId: c.productId,
    productName: c.productName,
    price: c.price,
    similarityScore: c.similarity,
    similarityPercentage: c.similarityPercentage,
    finalSimilarityScore: c.similarity,
    matchTier: c.tier === 'PRIMARY' ? 'TIER_1' : c.tier === 'SECONDARY' ? 'TIER_2' : 'TIER_3',
    matchTierLabel: c.tierLabel,
    matchedAttributes: c.matchedAttributes,
    benchmark_eligible: c.benchmarkEligible,
    is_outlier: false,
    priceInfluenceLevel: c.priceInfluenceLevel,
    priceInfluence: c.priceInfluenceLevel,
    priceInfluenceExplanation: c.priceInfluenceExplanation,
    influenceWeight: c.influenceWeight,
    functionalCompatibility: c.functionalCompatibility,
    exclusionReason: c.exclusionReason || undefined,
    imageUrl: c.imageUrl,
  }));

  const eligibleComps = selectedComparablesLegacy.filter((c) => c.benchmark_eligible);

  const calculationBreakdown: CalculationBreakdown = {
    known_production_cost: result.costAnalysis.knownCost > 0 ? result.costAnalysis.knownCost : null,
    margin_rate: result.costAnalysis.targetMarkupUsed,
    base_margin: Math.round(result.costAnalysis.knownCost * result.costAnalysis.minimumMarkupUsed),
    cost_state: result.costAnalysis.costState,
    craft_factor: 0,
    craft_adjustment: 0,
    craft_factor_breakdown: [],
    cost_based_price: result.costAnalysis.costAnchor,
    total_candidates_count: result.marketReference.totalCandidatesEvaluated,
    eligible_comparable_count: result.marketReference.validComparablesCount,
    contextual_excluded_count: result.marketReference.contextualCount + result.marketReference.excludedCount,
    weighted_market_price: result.marketReference.p50,
    market_evidence_adjustment: result.reconciliation.marketAdjustment,
    fair_minimum: result.reconciliation.fairPriceMin,
    suggested_price: result.reconciliation.suggestedPrice,
    fair_maximum: result.reconciliation.fairPriceMax,
    confidence: confLevel,
    confidence_reason: result.confidence.reasons.join('; '),
    mathematical_formula_str: result.reconciliation.reconciliationFormula,
    market_evidence_weight_pct: Math.round(result.reconciliation.evidenceQualityAlpha * 100),
    market_adjustment_explanation: result.reconciliation.reconciliationExplanation,
    reconciliation_formula: result.reconciliation.reconciliationFormula,
    cost_floor_amount: result.costAnalysis.costFloor,
    cost_anchor_amount: result.costAnalysis.costAnchor,
    fair_range_min_reason: result.reconciliation.fairRangeMinReason,
    fair_range_max_reason: result.reconciliation.fairRangeMaxReason,
    material_factor_bonus: 0,
    labour_time_factor_bonus: 0,
    craft_complexity_factor_bonus: 0,
    total_attribute_bonuses: 0,
    outlier_trimmed_comparable_prices: eligibleComps.map((c) => c.price),
    outlier_count: 0,
    benchmark_statistic_used: 'WEIGHTED_MARKET_REFERENCE',
    benchmark_price: result.marketReference.p50,
    cost_based_minimum: result.costAnalysis.costFloor,
  };

  const diagnostics: PricingDiagnosticAudit = {
    totalCandidates: result.marketReference.totalCandidatesEvaluated,
    tier1Count: result.marketReference.primaryCount,
    tier2Count: result.marketReference.secondaryCount,
    tier3Count: result.marketReference.contextualCount,
    rejectedCount: result.marketReference.excludedCount,
    benchmarkCandidateCount: result.marketReference.validComparablesCount,
    outlierCount: 0,
    retainedComparableCount: result.marketReference.validComparablesCount,
    q1: result.marketReference.p25,
    q3: result.marketReference.p75,
    iqr: result.marketReference.p75 && result.marketReference.p25 ? result.marketReference.p75 - result.marketReference.p25 : null,
    benchmarkPrice: result.marketReference.p50,
    pricingBasis: result.reconciliation.pricingBasis === 'MARKET_SUPPORTED' ? 'MARKET_SUPPORTED' : 'COST_ANCHORED',
    selectedComparables: selectedComparablesLegacy,
  };

  return {
    fair_price_min: result.reconciliation.fairPriceMin,
    fair_price_max: result.reconciliation.fairPriceMax,
    suggested_price: result.reconciliation.suggestedPrice,
    confidence: confLevel,
    known_cost: result.costAnalysis.knownCost,
    cost_state: result.costAnalysis.costState,
    pricing_basis: result.reconciliation.pricingBasis === 'MARKET_SUPPORTED' ? 'MARKET_SUPPORTED' : 'COST_ANCHORED',
    calculation_breakdown: calculationBreakdown,
    price_justification: result.explanation,
    factors_considered: [
      `Recorded material cost (${result.costAnalysis.materialCost !== null ? `₹${result.costAnalysis.materialCost}` : 'Not specified'})`,
      `Recorded labour cost (${result.costAnalysis.labourCost !== null ? `₹${result.costAnalysis.labourCost}` : 'Not specified'})`,
      `Production time (${result.costAnalysis.productionTime || 1} ${result.costAnalysis.productionTimeUnit || 'days'})`,
      result.reconciliation.pricingBasis === 'MARKET_SUPPORTED' ? `${result.marketReference.validComparablesCount} Observed marketplace comparables` : 'Production Economics Baseline',
    ],
    selected_comparables: selectedComparablesLegacy,
    excluded_comparables: result.marketReference.excludedComparables,
    reconciliation_formula: result.reconciliation.reconciliationFormula,
    reconciliation_inputs: result.reconciliation.reconciliationInputs,
    reconciliation_explanation: result.reconciliation.reconciliationExplanation,
    diagnostics,
    evidence_used: {
      comparable_count: result.marketReference.validComparablesCount,
      relevant_comparable_count: result.marketReference.validComparablesCount,
      high_relevance_count: result.marketReference.primaryCount,
      outliers_excluded_count: 0,
      price_range_str: result.marketReference.validComparablesCount > 0 ? `₹${result.marketReference.observedMinPrice}–₹${result.marketReference.observedMaxPrice}` : 'Unavailable',
      seasonal_signal: 'Seasonal craft relevance inferred',
      demand_signal: result.marketReference.validComparablesCount > 0 ? 'Internal category activity' : 'Unavailable',
      source_label: result.marketReference.validComparablesCount > 0 ? 'Observed marketplace comparables' : 'Marketplace comparables unavailable',
    },
    data_availability: {
      'Production Cost': result.costAnalysis.costState === 'COMPLETE' ? '✓ Verified (Artisan)' : result.costAnalysis.costState === 'PARTIAL' ? '⚠ Partial (Artisan)' : '✕ Unavailable',
      'Product Information': '✓ Verified (Artisan)',
      'Observed Marketplace Comparables': result.marketReference.validComparablesCount > 0 ? '✓ Observed (Marketplace)' : '✕ Unavailable',
      'External Market Evidence': '✕ Unavailable (No External API)',
      'Seasonal Demand': '✕ Unavailable',
    },
    evidence_provenance: result.evidenceProvenance as any,
    comparison_with_artisan_price: {
      artisan_price: result.artisanPriceComparison.artisanPrice,
      suggested_price: result.artisanPriceComparison.suggestedPrice,
      position_status: result.artisanPriceComparison.positionStatus,
      message: result.artisanPriceComparison.message,
    },
    reasoning_flow: result.reasoningFlow,
    missing_information: result.missingInformation,
    assumptions: result.assumptions,
  };
}

function generateFallbackJustification(
  evidence: PricingEvidencePackage,
  language: PricingLanguage,
  sugP: number,
  minP: number,
  maxP: number,
  bd?: CalculationBreakdown
): string {
  const knownCost = evidence.production_economics.known_cost;
  const name = evidence.product_context.name;
  const eligibleComps = evidence.marketplace_evidence.selected_comparables.filter((c) => c.benchmark_eligible);
  const contextualComps = evidence.marketplace_evidence.selected_comparables.filter((c) => !c.benchmark_eligible);
  const topEligible = eligibleComps[0];

  const marginAmt = bd?.base_margin ?? (knownCost > 0 ? Math.round(knownCost * 0.55) : 0);
  const craftAdj = bd?.craft_adjustment ?? 0;
  const costBasedP = bd?.cost_based_price ?? (knownCost + marginAmt + craftAdj);
  const weightedRef = bd?.weighted_market_price ?? null;
  const contextualCount = bd?.contextual_excluded_count ?? contextualComps.length;
  const eligibleCount = bd?.eligible_comparable_count ?? eligibleComps.length;

  const craftReasonParts = bd?.craft_factor_breakdown || [];
  let craftReasonStr = '';
  if (craftAdj > 0) {
    if (craftReasonParts.length > 0) {
      craftReasonStr = ` for the ${craftReasonParts.join(', ')}`;
    } else {
      const timeVal = evidence.production_economics.production_time;
      const timeUnit = evidence.production_economics.production_time_unit || 'days';
      if (timeVal && timeVal >= 3) {
        craftReasonStr = ` for the ${timeVal}-${timeUnit.replace(/s$/, '')} production effort`;
      } else {
        craftReasonStr = ` for craft quality adjustments`;
      }
    }
  }

  if (language === 'ta') {
    if (knownCost > 0 && topEligible) {
      return `உங்கள் "${name}" தயாரிப்பிற்கு பதிவு செய்யப்பட்ட உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')}. M63 நியாயமான 55% கைவினைஞர் லாபம் (₹${marginAmt.toLocaleString('en-IN')})${craftAdj > 0 ? ` மற்றும் கைவினை சரிசெய்தல் (₹${craftAdj.toLocaleString('en-IN')})` : ''} சேர்த்து செலவு அடிப்படையிலான விலை ₹${costBasedP.toLocaleString('en-IN')} வழங்குகிறது. சந்தையில் உள்ள ${eligibleCount} ஒத்த தயாரிப்புகளின் (எ.கா. [${topEligible.productName}] ₹${topEligible.price.toLocaleString('en-IN')}) எடையிடப்பட்ட குறிப்பு விலை ₹${weightedRef?.toLocaleString('en-IN') ?? '—'} உடன் ஒப்பிட்டு, பரிந்துரைக்கப்பட்ட விலை ₹${sugP.toLocaleString('en-IN')} ஆக நிர்ணயிக்கப்பட்டுள்ளது.`;
    }
    return `உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')} அடிப்படையில் பரிந்துரைக்கப்பட்ட விலை ₹${sugP.toLocaleString('en-IN')}.`;
  }
  if (language === 'hi') {
    if (knownCost > 0 && topEligible) {
      return `आपके "${name}" उत्पाद के लिए रिकॉर्ड की गई उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} है। M63 55% कारीगर मार्जिन (₹${marginAmt.toLocaleString('en-IN')})${craftAdj > 0 ? ` और शिल्प समायोजन (₹${craftAdj.toLocaleString('en-IN')})` : ''} जोड़कर लागत-आधारित मूल्य ₹${costBasedP.toLocaleString('en-IN')} देता है। ${eligibleCount} समान उत्पादों ([${topEligible.productName}] ₹${topEligible.price.toLocaleString('en-IN')}) के आधार पर अंतिम सुझाया गया मूल्य ₹${sugP.toLocaleString('en-IN')} है।`;
    }
    return `उत्पाद की लागत ₹${knownCost.toLocaleString('en-IN')} के आधार पर सुझाया गया मूल्य ₹${sugP.toLocaleString('en-IN')} है।`;
  }

  // English
  if (knownCost > 0 && eligibleCount > 0 && topEligible) {
    const remainingEligible = eligibleComps.slice(1);
    const simListStr = remainingEligible.length > 0
      ? `, followed by other eligible products with ${remainingEligible.map((c) => `${c.similarityPercentage}%`).join(', ')} similarity`
      : '';

    const contextualStr = contextualCount > 0
      ? ` The ${contextualComps[0] ? `${contextualComps[0].similarityPercentage}% similarity product` : `${contextualCount} product${contextualCount > 1 ? 's' : ''}`} is treated as contextual only and does not influence the price.`
      : '';

    const floorNoticeStr = sugP >= knownCost ? ` while keeping it above the verified production cost` : '';

    return `Your production cost is ₹${knownCost.toLocaleString('en-IN')}. M63 adds a fair artisan margin of ₹${marginAmt.toLocaleString('en-IN')}${craftAdj > 0 ? ` and a ₹${craftAdj.toLocaleString('en-IN')} craft adjustment${craftReasonStr}` : ''}, giving a cost-based price of ₹${costBasedP.toLocaleString('en-IN')}. The engine then aligns this with a weighted market reference of ₹${weightedRef?.toLocaleString('en-IN') ?? '—'} using ${eligibleCount} similar M63 products. The strongest match is [${topEligible.productName}] at ₹${topEligible.price.toLocaleString('en-IN')} with ${topEligible.similarityPercentage}% similarity${simListStr}.${contextualStr} This brings the recommendation to ₹${sugP.toLocaleString('en-IN')}${floorNoticeStr}.`;
  } else if (knownCost > 0) {
    const floorNoticeStr = ` while protecting your production cost floor`;
    return `Your production cost is ₹${knownCost.toLocaleString('en-IN')}. M63 adds a fair artisan margin of ₹${marginAmt.toLocaleString('en-IN')}${craftAdj > 0 ? ` and a ₹${craftAdj.toLocaleString('en-IN')} craft adjustment${craftReasonStr}` : ''}, giving a cost-based price of ₹${costBasedP.toLocaleString('en-IN')}. Market evidence was unavailable for this category, so the recommendation remains cost-anchored at ₹${sugP.toLocaleString('en-IN')}${floorNoticeStr}.`;
  } else if (weightedRef !== null) {
    return `M63 recommends a price of ₹${sugP.toLocaleString('en-IN')} derived from a weighted market reference of ₹${weightedRef.toLocaleString('en-IN')} across ${eligibleCount} pricing-eligible products, led by [${topEligible?.productName || 'M63 Craft'}] at ₹${topEligible?.price.toLocaleString('en-IN') || '—'}. Production cost details were not provided.`;
  }
  return `M63 suggests a baseline price of ₹${sugP.toLocaleString('en-IN')} for "${name}" based on general category benchmark data.`;
}

/**
 * Deterministic Fallback Recommendation Engine
 */
function generateFallbackRecommendation(
  evidence: PricingEvidencePackage,
  language: PricingLanguage,
  minP: number,
  maxP: number,
  sugP: number,
  confidence: ConfidenceLevel,
  positionStatus: 'below' | 'within' | 'above' | 'no_price',
  statusMessage: string,
  calculationBreakdown?: CalculationBreakdown
): FairPriceRecommendation {
  const knownCost = evidence.production_economics.known_cost;
  const costState = evidence.production_economics.cost_state;
  const artisanP = evidence.product_context.existing_price;
  const compCount = evidence.marketplace_evidence.relevant_comparable_count;
  const pricingBasis = evidence.marketplace_evidence.pricing_basis;
  const diag = evidence.marketplace_evidence.diagnostics;

  const justificationStr = generateFallbackJustification(evidence, language, sugP, minP, maxP, calculationBreakdown);

  const factors: Record<PricingLanguage, string[]> = {
    en: [
      `Recorded material cost (${evidence.production_economics.material_cost !== null ? `₹${evidence.production_economics.material_cost}` : 'Not specified'})`,
      `Recorded labour cost (${evidence.production_economics.labour_cost !== null ? `₹${evidence.production_economics.labour_cost}` : 'Not specified'})`,
      `Production time (${evidence.production_economics.production_time || 1} ${evidence.production_economics.production_time_unit || 'days'})`,
      pricingBasis === 'MARKET_SUPPORTED' ? `${compCount} Internal M63 Comparables` : 'Production Economics Baseline',
    ],
    ta: [
      `மூலப்பொருள் செலவு (₹${evidence.production_economics.material_cost || 0})`,
      `உழைப்பு கூலி (₹${evidence.production_economics.labour_cost || 0})`,
      `தயாரிப்பு நேரம் (${evidence.production_economics.production_time || 1} நாட்கள்)`,
      `உற்பத்தி செலவு கணக்கீடு`,
    ],
    hi: [
      `सामग्री लागत (₹${evidence.production_economics.material_cost || 0})`,
      `श्रम लागत (₹${evidence.production_economics.labour_cost || 0})`,
      `निर्माण समय (${evidence.production_economics.production_time || 1} दिन)`,
      `उत्पादन लागत आधार`,
    ],
  };

  const missingInfo: string[] = [];
  if (costState !== 'COMPLETE') missingInfo.push('Production cost details incomplete');
  if (compCount === 0) missingInfo.push('Internal market comparables unavailable');

  const step3Details: string[] = [];
  if (pricingBasis === 'MARKET_SUPPORTED') {
    step3Details.push(`Candidates evaluated: ${diag.totalCandidates}`);
    step3Details.push(`Relevant comparables selected: ${diag.benchmarkCandidateCount} (Tier 1: ${diag.tier1Count}, Tier 2: ${diag.tier2Count})`);
    if (diag.outlierCount > 0) {
      step3Details.push(`Outliers trimmed via IQR: ${diag.outlierCount}`);
    }
    step3Details.push(`Benchmark median: ₹${diag.benchmarkPrice}`);
  } else {
    step3Details.push('No sufficiently similar market comparables were found. Price was anchored to production cost instead.');
    step3Details.push(`Candidates evaluated: ${diag.totalCandidates} (Excluded below 0.35 similarity threshold: ${diag.rejectedCount})`);
  }

  return {
    fair_price_min: minP,
    fair_price_max: maxP,
    suggested_price: sugP,
    confidence,
    known_cost: knownCost,
    cost_state: costState,
    pricing_basis: pricingBasis,
    product_validation: evidence.product_validation,
    calculation_breakdown: calculationBreakdown,
    price_justification: justificationStr,
    factors_considered: factors[language],
    selected_comparables: evidence.marketplace_evidence.selected_comparables,
    diagnostics: diag,
    evidence_used: {
      comparable_count: compCount,
      relevant_comparable_count: compCount,
      high_relevance_count: evidence.marketplace_evidence.high_relevance_count,
      outliers_excluded_count: evidence.marketplace_evidence.outliers_excluded_count,
      price_range_str: compCount > 0 ? `₹${evidence.marketplace_evidence.observed_min_price}–₹${evidence.marketplace_evidence.observed_max_price}` : 'Unavailable',
      seasonal_signal: 'Seasonal craft relevance inferred',
      demand_signal: compCount > 0 ? 'Internal category activity' : 'Unavailable',
      source_label: compCount > 0 ? 'Internal M63 Marketplace Evidence' : 'Internal comparable evidence unavailable',
    },
    data_availability: {
      'Production Cost': costState === 'COMPLETE' ? '✓ Verified (Artisan)' : costState === 'PARTIAL' ? '⚠ Partial (Artisan)' : '✕ Unavailable',
      'Product Information': '✓ Verified (Artisan)',
      'M63 Internal Comparables': compCount > 0 ? '✓ Observed (Internal)' : '✕ Unavailable',
      'External Market Evidence': '✕ Unavailable (No External API)',
      'Seasonal Demand': '✕ Unavailable',
    },
    evidence_provenance: evidence.evidence_provenance,
    comparison_with_artisan_price: {
      artisan_price: artisanP,
      suggested_price: sugP,
      position_status: positionStatus,
      message: statusMessage,
    },
    reasoning_flow: [
      {
        step: 1,
        title: 'Production Economics',
        summary: `Known cost ₹${knownCost.toLocaleString('en-IN')}`,
        details: [
          `Material Cost: ${evidence.production_economics.material_cost !== null ? `₹${evidence.production_economics.material_cost}` : 'Missing'}`,
          `Labour Cost: ${evidence.production_economics.labour_cost !== null ? `₹${evidence.production_economics.labour_cost}` : 'Missing'}`,
          `Other Expenses: ${evidence.production_economics.other_expenses !== null ? `₹${evidence.production_economics.other_expenses}` : 'Missing'}`,
        ],
      },
      {
        step: 2,
        title: 'Product Context',
        summary: `${evidence.product_context.name}`,
        details: [
          `Category: ${evidence.product_context.category}`,
          `Material: ${evidence.product_context.material}`,
          `Craft Technique: ${evidence.product_context.craft_type}`,
        ],
      },
      {
        step: 3,
        title: 'Comparable Product Analysis',
        summary: pricingBasis === 'MARKET_SUPPORTED' ? `${compCount} relevant comparables selected` : 'Anchored to Production Cost',
        details: step3Details,
      },
      {
        step: 4,
        title: 'Price Position Analysis',
        summary: positionStatus.toUpperCase(),
        details: [statusMessage],
      },
      {
        step: 5,
        title: 'M63 Deterministic Decision',
        summary: `Suggested ₹${sugP.toLocaleString('en-IN')}`,
        details: [`Fair Price Range: ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}`],
      },
    ],
    missing_information: missingInfo,
    assumptions: knownCost === 0 ? ['Calculated using default craft baseline'] : [],
  };
}
