import { CostAnalysis, MarketReference, ReconciliationResult, PricingBasis } from './types.js';

export function reconcileCostAndMarket(
  cost: CostAnalysis,
  market: MarketReference
): ReconciliationResult {
  const validComps = market.validComparablesCount;
  const primaryCount = market.primaryCount;
  const secondaryCount = market.secondaryCount;
  const marketRef = market.p50;
  const knownCost = cost.knownCost;
  const costBasedPrice = cost.costBasedPrice || cost.costFloor || cost.costAnchor;

  // 1. Determine Pricing Basis
  let pricingBasis: PricingBasis = 'COST_ANCHORED';
  if (cost.costState === 'UNAVAILABLE' && validComps === 0) {
    pricingBasis = 'INSUFFICIENT_EVIDENCE';
  } else if (validComps >= 3 && (primaryCount >= 1 || secondaryCount >= 2)) {
    pricingBasis = 'MARKET_SUPPORTED';
  } else {
    pricingBasis = 'COST_ANCHORED';
  }

  // 2. Calculate evidence quality factor alpha in [0, 1]
  // Sparse evidence rule: 0 comps -> 0%, 1 comp -> 15%, 2 comps -> 30%, 3-5 comps -> 55-70%, 6+ comps -> 85%
  let alpha = 0.0;
  if (pricingBasis === 'MARKET_SUPPORTED' && marketRef !== null && marketRef > 0) {
    if (validComps >= 6 && primaryCount >= 3) {
      alpha = 0.85;
    } else if (validComps >= 4 && primaryCount >= 2) {
      alpha = 0.70;
    } else {
      alpha = 0.55;
    }
  } else if (validComps === 2) {
    alpha = 0.30;
  } else if (validComps === 1) {
    alpha = 0.15; // Exact 15% market influence for 1 eligible comparable
  } else {
    alpha = 0.0;
  }

  // 3. Deterministic Market Adjustment & Raw Market-Adjusted Price:
  // P_raw = F + alpha * (P_WM - F)
  // marketAdjustment = alpha * (P_WM - F)
  let marketAdjustment = 0;
  let rawSuggested = costBasedPrice;

  if (knownCost > 0) {
    if (marketRef !== null && marketRef > 0) {
      marketAdjustment = Math.round(alpha * (marketRef - costBasedPrice) * 100) / 100;
      rawSuggested = costBasedPrice + (alpha * (marketRef - costBasedPrice));
    } else {
      marketAdjustment = 0;
      rawSuggested = costBasedPrice;
    }
  } else {
    if (marketRef !== null && marketRef > 0) {
      rawSuggested = Math.round(marketRef);
    } else {
      rawSuggested = 850;
    }
  }

  // 4. Enforce Cost Floor Invariant: P_M63 = max(F, P_raw)
  let isCostFloorActive = false;
  let costFloorProtectionReason: string | null = null;
  let finalSuggested = rawSuggested;

  if (knownCost > 0) {
    if (rawSuggested < costBasedPrice) {
      finalSuggested = costBasedPrice;
      isCostFloorActive = true;
      costFloorProtectionReason = `Raw market-adjusted price (₹${Math.round(rawSuggested).toLocaleString('en-IN')}) is below your sustainable floor. Recommendation protected by the verified sustainable cost floor (₹${costBasedPrice.toLocaleString('en-IN')}).`;
    } else if (marketRef !== null && marketRef < costBasedPrice) {
      isCostFloorActive = true;
      costFloorProtectionReason = `Observed weighted market reference (₹${marketRef.toLocaleString('en-IN')}) is below your production cost floor (₹${costBasedPrice.toLocaleString('en-IN')}). Recommendation protected by the verified sustainable cost floor.`;
    } else {
      finalSuggested = Math.round(rawSuggested * 100) / 100;
    }
  } else {
    finalSuggested = Math.round(rawSuggested * 100) / 100;
  }

  // 5. Expose Market-Cost Mismatch Explicitly
  let hasMarketCostMismatch = false;
  let marketCostMismatchWarning: string | null = null;

  if (knownCost > 0 && marketRef !== null && marketRef < costBasedPrice) {
    hasMarketCostMismatch = true;
    marketCostMismatchWarning = `Market–Cost Mismatch: Comparable marketplace prices (observed reference ₹${marketRef.toLocaleString('en-IN')}) are substantially below your sustainable cost floor (₹${costBasedPrice.toLocaleString('en-IN')}). Matching the observed market price would not cover your stated production costs.`;
  } else if (knownCost > 0 && rawSuggested < costBasedPrice) {
    hasMarketCostMismatch = true;
    marketCostMismatchWarning = `Market–Cost Mismatch: Raw market-adjusted price (₹${Math.round(rawSuggested).toLocaleString('en-IN')}) falls below your sustainable cost floor (₹${costBasedPrice.toLocaleString('en-IN')}). Recommendation is cost-protected.`;
  }

  // 6. Calculate Independent Market Fair Price Range (DO NOT CLAMP TO COST FLOOR!)
  let fairMin: number | null = null;
  let fairMax: number | null = null;
  let fairRangeType: 'MARKET_BASED' | 'COST_ANCHORED' | 'INSUFFICIENT_EVIDENCE' = 'INSUFFICIENT_EVIDENCE';
  let fairRangeMinReason = '';
  let fairRangeMaxReason = '';

  if (market.p25 !== null && market.p75 !== null && validComps >= 3) {
    fairRangeType = 'MARKET_BASED';
    fairMin = Math.round(market.p25);
    fairMax = Math.round(market.p75);
    fairRangeMinReason = `Observed comparable market lower quartile P25 (₹${fairMin.toLocaleString('en-IN')}).`;
    fairRangeMaxReason = `Observed comparable market upper quartile P75 (₹${fairMax.toLocaleString('en-IN')}).`;
  } else {
    fairRangeType = 'INSUFFICIENT_EVIDENCE';
    fairMin = null;
    fairMax = null;
    fairRangeMinReason = 'Limited price information available to establish a reliable market range.';
    fairRangeMaxReason = 'Limited price information available to establish a reliable market range.';
  }

  // SAFETY: If fairMin > fairMax due to single comp, swap or adjust
  if (fairMin !== null && fairMax !== null && fairMin > fairMax) {
    const temp = fairMin;
    fairMin = fairMax;
    fairMax = temp;
  }

  const alphaPercent = Math.round(alpha * 100);
  let reconciliationExplanation = '';
  if (marketRef !== null && validComps > 0) {
    if (hasMarketCostMismatch) {
      reconciliationExplanation = `Observed weighted market reference is ₹${marketRef.toLocaleString('en-IN')}. Raw market-adjusted price is ₹${Math.round(rawSuggested).toLocaleString('en-IN')}. Because market prices fall below your verified production cost (+25% markup: ₹${costBasedPrice.toLocaleString('en-IN')}), M63 cost-floor protection is active, resulting in a cost-protected recommendation of ₹${finalSuggested.toLocaleString('en-IN')}.`;
    } else if (marketAdjustment >= 0) {
      reconciliationExplanation = `Observed weighted market reference is ₹${marketRef.toLocaleString('en-IN')}. Based on ${validComps} eligible comparable(s) (${alphaPercent}% market influence), M63 applies a market alignment of +₹${Math.abs(marketAdjustment).toLocaleString('en-IN')} to your cost-based price (₹${costBasedPrice.toLocaleString('en-IN')}).`;
    } else {
      reconciliationExplanation = `Observed weighted market reference is ₹${marketRef.toLocaleString('en-IN')}. Based on ${validComps} eligible comparable(s) (${alphaPercent}% market influence), M63 applies a market alignment of −₹${Math.abs(marketAdjustment).toLocaleString('en-IN')} to your cost-based price (₹${costBasedPrice.toLocaleString('en-IN')}).`;
    }
  } else {
    reconciliationExplanation = `No eligible marketplace comparables available. Recommendation is 100% anchored to verified cost-based price (₹${costBasedPrice.toLocaleString('en-IN')}).`;
  }

  return {
    pricingBasis,
    evidenceQualityAlpha: alpha,
    marketEvidenceWeight: alpha,
    costBasedPrice,
    costAnchor: costBasedPrice,
    marketReferencePrice: marketRef,
    marketAdjustment,
    rawMarketAdjustedPrice: rawSuggested,
    suggestedPrice: finalSuggested,
    fairPriceMin: fairMin,
    fairPriceMax: fairMax,
    isCostFloorActive,
    costFloorApplied: isCostFloorActive,
    costFloorProtectionReason,
    hasMarketCostMismatch,
    marketCostMismatchWarning,
    fairRangeType,
    reconciliationFormula: `P_suggested = max(F, F + α × (P_market - F))`,
    reconciliationInputs: {
      costAnchor: costBasedPrice,
      costBasedPrice,
      marketReference: marketRef,
      alpha,
      adjustment: marketAdjustment,
      rawMarketAdjustedPrice: rawSuggested,
    },
    reconciliationExplanation,
    fairRangeMinReason,
    fairRangeMaxReason,
  };
}
