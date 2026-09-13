export interface AttributeWeights {
  productType: number;
  intendedUse: number;
  quantity: number;
  material: number;
  craft: number;
  features: number;
  semantic: number;
}

export const BASE_ATTRIBUTE_WEIGHTS: AttributeWeights = {
  productType: 0.28,
  intendedUse: 0.16,
  quantity: 0.20,
  material: 0.16,
  craft: 0.10,
  features: 0.07,
  semantic: 0.03,
};

export type CategoryProfileKey =
  | 'VESSELS_TABLEWARE'
  | 'TEXTILES_APPAREL'
  | 'JEWELLERY_ACCESSORIES'
  | 'FURNITURE_UTILITY'
  | 'DECORATIVE_SCULPTURAL'
  | 'PAINTING_ART'
  | 'GENERAL_FALLBACK';

export const CATEGORY_PROFILES: Record<CategoryProfileKey, AttributeWeights> = {
  VESSELS_TABLEWARE: {
    productType: 0.30,
    intendedUse: 0.20,
    quantity: 0.25,
    material: 0.10,
    craft: 0.05,
    features: 0.05,
    semantic: 0.05,
  },
  TEXTILES_APPAREL: {
    productType: 0.25,
    intendedUse: 0.10,
    quantity: 0.15,
    material: 0.25,
    craft: 0.15,
    features: 0.05,
    semantic: 0.05,
  },
  JEWELLERY_ACCESSORIES: {
    productType: 0.25,
    intendedUse: 0.10,
    quantity: 0.10,
    material: 0.30,
    craft: 0.15,
    features: 0.05,
    semantic: 0.05,
  },
  FURNITURE_UTILITY: {
    productType: 0.25,
    intendedUse: 0.20,
    quantity: 0.20,
    material: 0.15,
    craft: 0.10,
    features: 0.05,
    semantic: 0.05,
  },
  DECORATIVE_SCULPTURAL: {
    productType: 0.20,
    intendedUse: 0.15,
    quantity: 0.10,
    material: 0.25,
    craft: 0.20,
    features: 0.05,
    semantic: 0.05,
  },
  PAINTING_ART: {
    productType: 0.25,
    intendedUse: 0.10,
    quantity: 0.10,
    material: 0.20,
    craft: 0.25,
    features: 0.05,
    semantic: 0.05,
  },
  GENERAL_FALLBACK: {
    ...BASE_ATTRIBUTE_WEIGHTS,
  },
};

export const PRICING_CONFIG = {
  // Thresholds
  primarySimilarityThreshold: 0.75,
  secondarySimilarityThreshold: 0.55,
  contextualSimilarityThreshold: 0.40,

  // Comparables & Influence Limits
  maxActiveComparables: 8,
  maxComparableInfluence: 0.45,
  semanticWeightCap: 0.03,

  // Cost Markup Assumptions (Configurable business assumptions; MARKUP where Price = Cost * (1 + Markup))
  minimumMarkup: 0.25, // 25% minimum markup for Cost Floor (P_floor)
  targetMarkup: 0.50,  // 50% target markup for Cost Anchor (P_anchor)

  // Versioning
  materialSimilarityVersion: 'v1',
};
