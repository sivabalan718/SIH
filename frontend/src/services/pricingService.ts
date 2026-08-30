import { apiRequest } from './api.js';

export type PricingLanguage = 'en' | 'ta' | 'hi';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ProductionTimeUnit = 'hours' | 'days' | 'weeks';

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

export interface FairPriceRecommendationResponse {
  fair_price_min: number | null;
  fair_price_max: number | null;
  suggested_price: number | null;
  confidence: ConfidenceLevel;
  known_cost: number;
  price_justification?: string;
  factors_considered: string[];
  evidence_used?: {
    comparable_count: number;
    price_range_str: string;
    seasonal_signal: string;
    demand_signal: string;
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
