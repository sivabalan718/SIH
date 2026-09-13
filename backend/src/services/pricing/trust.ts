import { TargetProductInput, CostAnalysis, MarketReference, DataTrustLevel, EvidenceProvenanceItem } from './types.js';

export function buildTrustAndProvenance(
  input: TargetProductInput,
  cost: CostAnalysis,
  market: MarketReference
): { trustMatrix: Record<string, DataTrustLevel>; provenance: Record<string, EvidenceProvenanceItem> } {
  const trustMatrix: Record<string, DataTrustLevel> = {
    production_cost: cost.costState === 'COMPLETE' ? 'VERIFIED' : cost.costState === 'PARTIAL' ? 'INFERRED' : 'UNAVAILABLE',
    product_information: input.name || input.category ? 'VERIFIED' : 'UNAVAILABLE',
    m63_observed_market_prices: market.validComparablesCount > 0 ? 'OBSERVED' : 'UNAVAILABLE',
    external_market_evidence: 'UNAVAILABLE',
    derived_pricing_metrics: 'INFERRED',
  };

  const provenance: Record<string, EvidenceProvenanceItem> = {
    production_cost: {
      sourceType: cost.costState !== 'UNAVAILABLE' ? 'ARTISAN_INPUT' : 'UNAVAILABLE',
      trustLevel: trustMatrix.production_cost,
      description: cost.costState === 'COMPLETE' ? 'Complete cost breakdown entered by artisan' : cost.costState === 'PARTIAL' ? 'Partial production cost input entered by artisan' : 'No cost breakdown entered',
      value: cost.knownCost > 0 ? `₹${cost.knownCost.toLocaleString('en-IN')}` : 'Unavailable',
      sourceReference: 'Artisan Cost Entry',
    },
    product_information: {
      sourceType: input.name || input.category ? 'ARTISAN_INPUT' : 'UNAVAILABLE',
      trustLevel: trustMatrix.product_information,
      description: 'Product identity, category, and material specifications',
      value: `${input.name || 'Craft Product'} (${input.category || 'General Craft'})`,
      sourceReference: 'Artisan Product Listing',
    },
    m63_observed_market_prices: {
      sourceType: market.validComparablesCount > 0 ? 'M63_INTERNAL' : 'UNAVAILABLE',
      trustLevel: trustMatrix.m63_observed_market_prices,
      description: market.validComparablesCount > 0
        ? `Observed listing prices across ${market.validComparablesCount} M63 marketplace candidate products (${market.primaryCount} Primary)`
        : 'No observed marketplace comparables available.',
      value: market.p50 ? `₹${market.observedMinPrice}–₹${market.observedMaxPrice} (Median ₹${market.p50.toLocaleString('en-IN')})` : 'Unavailable',
      sourceReference: market.validComparablesCount > 0 ? 'Internal M63 Marketplace Database' : 'N/A',
    },
    external_market_evidence: {
      sourceType: 'UNAVAILABLE',
      trustLevel: 'UNAVAILABLE',
      description: 'External independent marketplace prices',
      value: 'Unavailable',
      sourceReference: 'No External Market API Connected',
    },
    derived_pricing_metrics: {
      sourceType: 'INFERRED',
      trustLevel: 'INFERRED',
      description: 'Deterministic backend-derived cost floor, cost anchor, and similarity-weighted statistics',
      value: `Floor ₹${cost.costFloor}, Anchor ₹${cost.costAnchor}`,
      sourceReference: 'M63 Deterministic Pricing Engine v1.0',
    },
  };

  return { trustMatrix, provenance };
}
