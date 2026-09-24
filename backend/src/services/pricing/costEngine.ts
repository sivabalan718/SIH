import { TargetProductInput, CostAnalysis } from './types.js';
import { PRICING_CONFIG } from './config.js';

export function calculateCostAnalysis(input: TargetProductInput): CostAnalysis {
  const mat = input.materialCost !== undefined && input.materialCost !== null ? Math.max(0, input.materialCost) : null;
  const lab = input.labourCost !== undefined && input.labourCost !== null ? Math.max(0, input.labourCost) : null;
  const oth = input.otherExpenses !== undefined && input.otherExpenses !== null ? Math.max(0, input.otherExpenses) : null;

  const knownCost = (mat || 0) + (lab || 0) + (oth || 0);

  let costState: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' = 'UNAVAILABLE';
  if (knownCost === 0) {
    costState = 'UNAVAILABLE';
  } else if (mat !== null && lab !== null && oth !== null) {
    costState = 'COMPLETE';
  } else if (mat !== null || lab !== null || oth !== null) {
    costState = 'PARTIAL';
  } else {
    costState = 'UNAVAILABLE';
  }


  const markupRate = PRICING_CONFIG.markupRate ?? PRICING_CONFIG.minimumMarkup; // 0.25 (25% markup rate)
  const markupAmount = knownCost > 0 ? Math.round(knownCost * markupRate * 100) / 100 : 0;
  const costBasedPrice = knownCost > 0 ? Math.round(knownCost * (1 + markupRate) * 100) / 100 : 0;

  const sustainablePriceFloor = costBasedPrice;
  const costFloor = costBasedPrice;
  const costAnchor = costBasedPrice;

  // QA check on implied labour rate (production time does NOT add a second labour charge!)
  const pTime = input.productionTime || null;
  const pUnit = input.productionTimeUnit || null;

  let impliedLabourRate: number | null = null;
  let laborRateNotice: string | null = null;

  if (lab !== null && lab > 0 && pTime !== null && pTime > 0) {
    impliedLabourRate = Math.round((lab / pTime) * 100) / 100;
    if (impliedLabourRate < 20 && pUnit === 'hours') {
      laborRateNotice = `Implied hourly labour rate (₹${impliedLabourRate}/hr) appears low. Please verify your labour cost input.`;
    }
  }

  return {
    knownCost,
    materialCost: mat,
    labourCost: lab,
    otherExpenses: oth,
    costState,
    costBasedPrice,
    markupAmount,
    markupRate,
    sustainablePriceFloor,
    costFloor,
    costAnchor,
    minimumMarkupUsed: markupRate,
    targetMarkupUsed: markupRate,
    productionTime: pTime,
    productionTimeUnit: pUnit,
    impliedLabourRate,
    laborRateNotice,
  };
}
