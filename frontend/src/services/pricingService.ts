import { apiRequest } from './api.js';

export type PricingLanguage = 'en' | 'ta' | 'hi';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ProductionTimeUnit = 'hours' | 'days' | 'weeks';
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

export interface VoiceExtractionResponse {
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

export interface FairPricingInputPayload {
  productId?: string;
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

  material_cost?: number | null;
  labour_cost?: number | null;
  other_expenses?: number | null;
  production_time?: number | null;
  production_time_unit?: ProductionTimeUnit | null;
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

export interface CalculationBreakdown {
  known_production_cost: number | null;
  margin_rate?: number;
  base_margin: number;
  cost_state: CostState;
  craft_factor?: number;
  craft_adjustment?: number;
  craft_factor_breakdown?: string[];
  cost_based_price?: number;
  total_candidates_count?: number;
  eligible_comparable_count: number;
  contextual_excluded_count?: number;
  weighted_market_price?: number | null;
  market_evidence_adjustment: number;
  fair_minimum: number;
  suggested_price: number;
  fair_maximum: number;
  confidence?: ConfidenceLevel;
  confidence_reason?: string;
  mathematical_formula_str: string;
  market_evidence_weight_pct?: number;
  market_adjustment_explanation?: string;
  reconciliation_formula?: string;
  cost_floor_amount?: number;
  cost_anchor_amount?: number;
  fair_range_min_reason?: string;
  fair_range_max_reason?: string;

  // Compatibility fields
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

export interface FairPriceRecommendationResponse {
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
  evidence_used?: {
    comparable_count: number;
    relevant_comparable_count?: number;
    high_relevance_count?: number;
    outliers_excluded_count?: number;
    price_range_str: string;
    seasonal_signal: string;
    demand_signal: string;
    source_label?: string;
  };
  data_availability?: Record<string, string>;
  comparison_with_artisan_price?: ArtisanPriceComparison;
  reasoning_flow?: ReasoningFlowStep[];
  explanation?: string;
  missing_information: string[];
  assumptions: string[];
}

export interface SavePricingPayload {
  material_cost?: number | null;
  labour_cost?: number | null;
  other_expenses?: number | null;
  production_time?: number | null;
  production_time_unit?: ProductionTimeUnit | null;
  recommendation?: FairPriceRecommendationResponse | null;
  recommendation_status?: 'none' | 'applied' | 'kept' | 'outdated';
  active_language?: PricingLanguage;
}

export interface GetPricingResponse {
  productId: string;
  pricing: {
    material_cost: number | null;
    labour_cost: number | null;
    other_expenses: number | null;
    production_time: number | null;
    production_time_unit: ProductionTimeUnit | null;
    known_cost: number;
    fair_price_min: number | null;
    fair_price_max: number | null;
    suggested_price: number | null;
    confidence: ConfidenceLevel;
    factors_considered?: string[];
    price_justification?: string;
    evidence_used?: {
      comparable_count: number;
      price_range_str: string;
      seasonal_signal: string;
      demand_signal: string;
    };
    data_availability?: Record<string, string>;
    comparison_with_artisan_price?: ArtisanPriceComparison;
    reasoning_flow?: ReasoningFlowStep[];
    missing_information: string[];
    assumptions: string[];
    recommendation_status: 'none' | 'applied' | 'kept' | 'outdated';
    active_language: PricingLanguage;
  } | null;
}

/**
 * Send audio blob to backend Gemini voice extraction service
 */
export async function extractPricingVoice(
  audioBlob: Blob,
  language: PricingLanguage = 'en',
  browserTranscript?: string
): Promise<VoiceExtractionResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'pricing_audio.webm');
  formData.append('language', language);
  if (browserTranscript) {
    formData.append('browserTranscript', browserTranscript);
  }

  return await apiRequest<VoiceExtractionResponse>('/ai/pricing/voice-extract', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Call backend AI pricing recommendation service
 */
export async function recommendFairPrice(
  input: FairPricingInputPayload,
  language: PricingLanguage = 'en'
): Promise<FairPriceRecommendationResponse> {
  return await apiRequest<FairPriceRecommendationResponse>('/ai/pricing/recommend', {
    method: 'POST',
    body: JSON.stringify({ input, language }),
  });
}

/**
 * Save pricing intelligence record for product
 */
export async function savePricingState(
  productId: string,
  pricingData: SavePricingPayload
): Promise<any> {
  return await apiRequest('/ai/pricing/save', {
    method: 'POST',
    body: JSON.stringify({ productId, pricingData }),
  });
}

/**
 * Fetch saved pricing intelligence state for product
 */
export async function getPricingState(productId: string): Promise<GetPricingResponse> {
  return await apiRequest<GetPricingResponse>(`/ai/pricing/${productId}`, {
    method: 'GET',
  });
}
