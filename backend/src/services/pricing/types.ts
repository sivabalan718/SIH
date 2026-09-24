export type PricingLanguage = 'en' | 'ta' | 'hi';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProductionTimeUnit = 'hours' | 'days' | 'weeks';
export type DataTrustLevel = 'VERIFIED' | 'OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
export type PricingBasis = 'MARKET_SUPPORTED' | 'COST_ANCHORED' | 'INSUFFICIENT_EVIDENCE';
export type ComparableTier = 'PRIMARY' | 'SECONDARY' | 'CONTEXTUAL' | 'EXCLUDED';
export type MatchState = 'EXACT' | 'STRONG_RELATED' | 'PARTIAL' | 'DIFFERENT' | 'MISSING';

export interface RawCandidateProduct {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  product_type?: string | null;
  intended_use?: string | null;
  material?: string | null;
  craft_type?: string | null;
  craft_technique?: string | null;
  quantity?: number | null;
  set_size?: number | null;
  dimensions?: string | { length?: number; width?: number; height?: number } | null;
  capacity?: number | string | null;
  weight?: number | string | null;
  features?: string[] | null;
  description?: string | null;
  price: number;
  status?: string | null;
  image_url?: string | null;
  artisan_id?: string | null;
}

export interface TargetProductInput {
  productId?: string;
  name?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
  intendedUse?: string;
  material?: string;
  craftType?: string;
  craftTechnique?: string;
  quantity?: number;
  dimensions?: string;
  capacity?: string | number;
  weight?: string | number;
  features?: string[];
  description?: string;
  highlights?: string[];
  tags?: string[];
  existingPrice?: number | null;

  // Cost inputs
  materialCost?: number | null;
  labourCost?: number | null;
  otherExpenses?: number | null;
  productionTime?: number | null;
  productionTimeUnit?: ProductionTimeUnit | null;
}

export interface AttributeMatchBreakdown {
  productType: { score: number; state: MatchState; weight: number };
  intendedUse: { score: number; state: MatchState; weight: number };
  quantity: { score: number; state: MatchState; weight: number };
  material: { score: number; state: MatchState; weight: number };
  craft: { score: number; state: MatchState; weight: number };
  features: { score: number; state: MatchState; weight: number };
  semantic: { score: number; state: MatchState; weight: number };
}

export interface ComparableResult {
  productId: string;
  productName: string;
  price: number;
  similarity: number; // 0..1 (Final canonical economic comparability score)
  similarityPercentage: number; // 0..100
  finalSimilarityScore: number; // 0..1
  tier: ComparableTier;
  tierLabel: string;
  functionalCompatibility: 'COMPATIBLE' | 'CONTEXTUAL_ONLY' | 'INCOMPATIBLE';
  benchmarkEligible: boolean;
  rawInfluence: number;
  normalizedInfluence: number;
  cappedInfluence: number;
  influenceWeight: number;
  matchedAttributes: string[];
  differingAttributes: string[];
  priceInfluenceLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  priceInfluenceExplanation: string;
  breakdown: AttributeMatchBreakdown;
  exclusionReason?: string | null;
  imageUrl?: string;
}

export interface CostAnalysis {
  knownCost: number;
  materialCost: number | null;
  labourCost: number | null;
  otherExpenses: number | null;
  costState: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
  costBasedPrice: number; // Single canonical cost-based price F = knownCost * (1 + markupRate)
  markupAmount: number; // knownCost * markupRate
  markupRate: number; // Configured markup rate (e.g. 0.25 for 25%)
  sustainablePriceFloor: number; // Equals costBasedPrice
  costFloor: number; // Equals costBasedPrice (knownCost * (1 + markupRate))
  costAnchor: number; // Alias for costBasedPrice
  minimumMarkupUsed: number;
  targetMarkupUsed: number;
  productionTime: number | null;
  productionTimeUnit: ProductionTimeUnit | null;
  impliedLabourRate: number | null;
  laborRateNotice: string | null;
}

export interface ExcludedComparableItem {
  productId: string;
  productName: string;
  price: number;
  rawSimilarity: number;
  functionalFamily: string;
  exclusionReason: string;
}

export interface MarketReference {
  totalCandidatesEvaluated: number;
  candidatesAfterSelfExclusion: number;
  candidatesAfterFunctionalGate: number;
  validComparablesCount: number;
  primaryCount: number;
  secondaryCount: number;
  contextualCount: number;
  excludedCount: number;
  p25: number | null;
  p50: number | null; // Market Reference Median
  p75: number | null;
  marketReferencePrice: number | null;
  observedMinPrice: number | null;
  observedMaxPrice: number | null;
  selectedComparables: ComparableResult[];
  excludedComparables: ExcludedComparableItem[];
}

export interface ReconciliationResult {
  pricingBasis: PricingBasis;
  evidenceQualityAlpha: number; // 0..1
  marketEvidenceWeight: number; // alpha (0..1)
  costBasedPrice: number; // F = C * (1 + m)
  costAnchor: number; // Alias for costBasedPrice
  marketReferencePrice: number | null;
  marketAdjustment: number; // alpha * (marketRef - costBasedPrice)
  rawMarketAdjustedPrice: number; // F + alpha * (marketRef - F)
  suggestedPrice: number; // max(costBasedPrice, rawMarketAdjustedPrice)
  fairPriceMin: number | null;
  fairPriceMax: number | null;
  isCostFloorActive: boolean;
  costFloorApplied: boolean; // Alias for isCostFloorActive
  costFloorProtectionReason: string | null;
  hasMarketCostMismatch: boolean;
  marketCostMismatchWarning: string | null;
  fairRangeType: 'MARKET_BASED' | 'COST_ANCHORED' | 'INSUFFICIENT_EVIDENCE';
  reconciliationFormula: string;
  reconciliationInputs: {
    costAnchor: number;
    costBasedPrice: number;
    marketReference: number | null;
    alpha: number;
    adjustment: number;
    rawMarketAdjustedPrice: number;
  };
  reconciliationExplanation: string;
  fairRangeMinReason: string;
  fairRangeMaxReason: string;
}

export interface PricingConfidence {
  score: number; // 0..1
  level: ConfidenceLevel; // Overall Recommendation Confidence
  costConfidence: ConfidenceLevel; // Cost Evidence Confidence
  marketConfidence: ConfidenceLevel; // Market Evidence Confidence
  reasons: string[];
}

export interface EvidenceProvenanceItem {
  sourceType: 'ARTISAN_INPUT' | 'M63_INTERNAL' | 'EXTERNAL_OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
  trustLevel: DataTrustLevel;
  description: string;
  value: string;
  sourceReference: string;
}

export interface PricingEvidencePacket {
  targetProductId: string | null;
  targetProductName: string;
  costAnalysis: CostAnalysis;
  marketReference: MarketReference;
  reconciliation: ReconciliationResult;
  confidence: PricingConfidence;
  trustMatrix: Record<string, DataTrustLevel>;
  evidenceProvenance: Record<string, EvidenceProvenanceItem>;
  artisanPriceComparison: {
    artisanPrice: number | null;
    suggestedPrice: number;
    fairPriceMin: number;
    fairPriceMax: number;
    positionStatus: 'below' | 'within' | 'above' | 'no_price';
    message: string;
  };
  reasoningFlow: Array<{
    step: number;
    title: string;
    summary: string;
    details: string[];
  }>;
  assumptions: string[];
  missingInformation: string[];
  limitations: string[];
}

export interface PricingResult extends PricingEvidencePacket {
  explanation: string;
  explanationGeneratedBy: 'GEMINI_VALIDATED' | 'DETERMINISTIC_FALLBACK';
}
