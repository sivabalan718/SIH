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
  const costFloor = cost.costFloor;
  const costAnchor = cost.costAnchor;

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

  // 3. Deterministic Market Adjustment:
  // marketAdjustment = alpha * (marketRef - costAnchor)
  let marketAdjustment = 0;
  let rawSuggested = costAnchor;

  if (knownCost > 0) {
    if (marketRef !== null && marketRef > 0) {
      marketAdjustment = Math.round(alpha * (marketRef - costAnchor));
      rawSuggested = costAnchor + marketAdjustment;
    } else {
      marketAdjustment = 0;
      rawSuggested = Math.round(costAnchor);
    }
  } else {
    if (marketRef !== null && marketRef > 0) {
      rawSuggested = Math.round(marketRef);
    } else {
      rawSuggested = 850;
    }
  }

  // 4. Enforce Cost Floor Invariant: suggestedPrice >= costFloor
  let isCostFloorActive = false;
  let costFloorProtectionReason: string | null = null;
  let finalSuggested = rawSuggested;

  if (knownCost > 0) {
    if (finalSuggested < costFloor) {
      finalSuggested = costFloor;
      isCostFloorActive = true;
      costFloorProtectionReason = `Observed marketplace evidence is below the sustainable cost floor, so M63 anchors the recommendation to the minimum viable price (₹${costFloor.toLocaleString('en-IN')}) rather than recommending a price below production cost.`;
    } else if (marketRef !== null && marketRef < costFloor) {
      isCostFloorActive = true;
      costFloorProtectionReason = `Observed weighted market reference (₹${marketRef.toLocaleString('en-IN')}) is below your production cost floor (₹${costFloor.toLocaleString('en-IN')}). M63 protected your production economics.`;
    }
  }

  // 5. Calculate Fair Price Range (P_min -> P_max)
  let fairMin = 0;
  let fairMax = 0;
  let fairRangeType: 'MARKET_BASED' | 'COST_ANCHORED' = 'COST_ANCHORED';
  let fairRangeMinReason = '';
  let fairRangeMaxReason = '';

  if (pricingBasis === 'MARKET_SUPPORTED' && market.p25 !== null && market.p75 !== null) {
    fairRangeType = 'MARKET_BASED';
    if (knownCost > 0 && costFloor > market.p25) {
      fairMin = costFloor;
      fairRangeMinReason = `Cost floor protection (₹${costFloor.toLocaleString('en-IN')}) enforces minimum viable price above market P25 (₹${market.p25.toLocaleString('en-IN')}).`;
    } else {
      fairMin = market.p25;
      fairRangeMinReason = `Supported by observed market lower band P25 (₹${market.p25.toLocaleString('en-IN')}).`;
    }
    fairMax = Math.max(finalSuggested, market.p75);
    fairRangeMaxReason = `Supported by observed market upper band P75 (₹${market.p75.toLocaleString('en-IN')}).`;
  } else {
    fairRangeType = 'COST_ANCHORED';
    if (knownCost > 0) {
      fairMin = Math.round(costFloor);
      fairRangeMinReason = `Sustainable production cost floor (+${Math.round(cost.minimumMarkupUsed * 100)}% markup: ₹${costFloor.toLocaleString('en-IN')}).`;
      fairMax = Math.max(finalSuggested, Math.round(costAnchor * 1.25));
      fairRangeMaxReason = `Cost anchor ceiling (+${Math.round(cost.targetMarkupUsed * 100)}% markup with craft headroom: ₹${fairMax.toLocaleString('en-IN')}).`;
    } else if (marketRef !== null) {
      fairMin = Math.round(marketRef * 0.85);
      fairRangeMinReason = `Estimated lower market band (85% of market reference ₹${marketRef.toLocaleString('en-IN')}).`;
      fairMax = Math.round(marketRef * 1.25);
      fairRangeMaxReason = `Estimated upper market band (125% of market reference ₹${marketRef.toLocaleString('en-IN')}).`;
    } else {
      fairMin = 650;
      fairRangeMinReason = 'General craft baseline minimum.';
      fairMax = 1100;
      fairRangeMaxReason = 'General craft baseline maximum.';
    }
  }

  // Hard Invariants Safety Check
  fairMin = Math.max(costFloor, fairMin);
  fairMin = Math.min(fairMin, finalSuggested);
  fairMax = Math.max(finalSuggested, fairMax);

  const alphaPercent = Math.round(alpha * 100);
  let reconciliationExplanation = '';
  if (marketRef !== null && validComps > 0) {
    if (marketAdjustment >= 0) {
      reconciliationExplanation = `Observed weighted market reference is ₹${marketRef.toLocaleString('en-IN')}. Based on ${validComps} eligible comparable(s) (${alphaPercent}% market influence), M63 applies a market alignment of +₹${marketAdjustment.toLocaleString('en-IN')} to your cost anchor (₹${costAnchor.toLocaleString('en-IN')}).`;
    } else {
      reconciliationExplanation = `Observed weighted market reference is ₹${marketRef.toLocaleString('en-IN')}. Based on ${validComps} eligible comparable(s) (${alphaPercent}% market influence), M63 applies a market alignment of −₹${Math.abs(marketAdjustment).toLocaleString('en-IN')} to your cost anchor (₹${costAnchor.toLocaleString('en-IN')}).`;
    }
  } else {
    reconciliationExplanation = `No eligible marketplace comparables available. Recommendation is 100% anchored to verified production cost anchor (₹${costAnchor.toLocaleString('en-IN')}).`;
  }

  return {
    pricingBasis,
    evidenceQualityAlpha: alpha,
    marketEvidenceWeight: alpha,
    costAnchor,
    marketReferencePrice: marketRef,
    marketAdjustment,
    suggestedPrice: finalSuggested,
    fairPriceMin: fairMin,
    fairPriceMax: fairMax,
    isCostFloorActive,
    costFloorProtectionReason,
    fairRangeType,
    reconciliationFormula: `P_suggested = max(P_floor, P_anchor + α × (P_market - P_anchor))`,
    reconciliationInputs: {
      costAnchor,
      marketReference: marketRef,
      alpha,
      adjustment: marketAdjustment,
    },
    reconciliationExplanation,
    fairRangeMinReason,
    fairRangeMaxReason,
  };
}
