import { TargetProductInput, CostAnalysis, MarketReference, ReconciliationResult, PricingConfidence, DataTrustLevel, EvidenceProvenanceItem, PricingEvidencePacket } from './types.js';

export function buildEvidencePacket(
  input: TargetProductInput,
  cost: CostAnalysis,
  market: MarketReference,
  reconciliation: ReconciliationResult,
  confidence: PricingConfidence,
  trustMatrix: Record<string, DataTrustLevel>,
  provenance: Record<string, EvidenceProvenanceItem>,
  hasFactConflicts: boolean
): PricingEvidencePacket {
  const artisanPrice = input.existingPrice || null;
  const sugP = reconciliation.suggestedPrice;
  const minP = reconciliation.fairPriceMin;
  const maxP = reconciliation.fairPriceMax;
  const knownCost = cost.knownCost;

  let positionStatus: 'below' | 'within' | 'above' | 'no_price' = 'no_price';
  let message = '';

  const rangeStr = (minP !== null && maxP !== null) ? `₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}` : 'Market range unavailable';

  if (artisanPrice && artisanPrice > 0) {
    if (knownCost > 0 && artisanPrice <= knownCost) {
      positionStatus = 'below';
      message = `HIGH-PRIORITY WARNING: Your current price (₹${artisanPrice.toLocaleString('en-IN')}) is at or below your verified production cost (₹${knownCost.toLocaleString('en-IN')}). This leaves no margin to cover production expenses.`;
    } else if (minP !== null && artisanPrice < minP) {
      positionStatus = 'below';
      message = `Your current price (₹${artisanPrice.toLocaleString('en-IN')}) is below M63's observed market range (${rangeStr}).`;
    } else if (maxP !== null && artisanPrice > maxP) {
      positionStatus = 'above';
      message = `Your current price (₹${artisanPrice.toLocaleString('en-IN')}) is above M63's observed market range (${rangeStr}).`;
    } else {
      positionStatus = 'within';
      message = `Your current price (₹${artisanPrice.toLocaleString('en-IN')}) is within M63's observed market range (${rangeStr}).`;
    }
  } else {
    positionStatus = 'no_price';
    message = 'No current selling price set yet.';
  }

  const reasoningFlow = [
    {
      step: 1,
      title: 'Production Economics',
      summary: knownCost > 0 ? `Known cost ₹${knownCost.toLocaleString('en-IN')}` : 'Cost breakdown incomplete',
      details: [
        `Material: ${cost.materialCost !== null ? `₹${cost.materialCost}` : 'Not provided'}`,
        `Labour: ${cost.labourCost !== null ? `₹${cost.labourCost}` : 'Not provided'}`,
        `Other Expenses: ${cost.otherExpenses !== null ? `₹${cost.otherExpenses}` : 'Not provided'}`,
        `Markup Amount (${Math.round(cost.markupRate * 100)}% Markup): +₹${cost.markupAmount.toLocaleString('en-IN')}`,
        `Sustainable Cost Floor: ₹${cost.costBasedPrice.toLocaleString('en-IN')}`,
      ],
    },
    {
      step: 2,
      title: 'Product Context & Attributes',
      summary: `${input.name || 'Craft Product'}`,
      details: [
        `Category: ${input.category || 'General Craft'}`,
        `Material: ${input.material || 'Artisan Material'}`,
        `Craft: ${input.craftType || 'Handicraft'}`,
      ],
    },
    {
      step: 3,
      title: 'Relevant Marketplace Evidence',
      summary: reconciliation.pricingBasis === 'MARKET_SUPPORTED'
        ? `${market.validComparablesCount} valid comparables selected (${market.primaryCount} Primary)`
        : 'Anchored to Production Economics',
      details: reconciliation.pricingBasis === 'MARKET_SUPPORTED'
        ? [
            `Candidates evaluated: ${market.totalCandidatesEvaluated}`,
            `After self-exclusion & functional gate: ${market.candidatesAfterFunctionalGate}`,
            `Similarity-Weighted Median (P50): ₹${market.p50?.toLocaleString('en-IN') ?? 'N/A'}`,
            `Observed Market Band (P25–P75): ${market.p25 && market.p75 ? `₹${market.p25.toLocaleString('en-IN')} – ₹${market.p75.toLocaleString('en-IN')}` : 'Insufficient data'}`,
          ]
        : [
            `No sufficiently similar market comparables found.`,
            `Recommendation is anchored to production cost to protect artisan economics.`,
          ],
    },
    {
      step: 4,
      title: 'Cost & Market Reconciliation',
      summary: `Pricing Basis: ${reconciliation.pricingBasis}`,
      details: [
        `Evidence Quality Alpha: ${Math.round(reconciliation.evidenceQualityAlpha * 100)}%`,
        reconciliation.hasMarketCostMismatch && reconciliation.marketCostMismatchWarning
          ? reconciliation.marketCostMismatchWarning
          : reconciliation.isCostFloorActive && reconciliation.costFloorProtectionReason
          ? reconciliation.costFloorProtectionReason
          : 'Suggested price balances production economics with observed marketplace reference.',
      ],
    },
    {
      step: 5,
      title: 'M63 Deterministic Decision',
      summary: `Suggested ₹${sugP.toLocaleString('en-IN')}`,
      details: [
        `Observed Market Range: ${rangeStr}`,
        `Overall Confidence: ${confidence.level} (${Math.round(confidence.score * 100)}%)`,
        `Cost Confidence: ${confidence.costConfidence} | Market Confidence: ${confidence.marketConfidence}`,
      ],
    },
  ];

  const missingInformation: string[] = [];
  if (cost.costState !== 'COMPLETE') missingInformation.push('Production cost details incomplete');
  if (market.validComparablesCount === 0) missingInformation.push('No relevant internal marketplace comparables available');

  const assumptions: string[] = [
    `Configured markup assumption: ${Math.round(cost.markupRate * 100)}% markup on production cost`,
  ];

  const limitations: string[] = [];
  if (market.validComparablesCount < 3) limitations.push('Marketplace sample size is limited.');
  if (reconciliation.hasMarketCostMismatch) limitations.push('Substantial divergence between observed market prices and production cost floor.');
  if (hasFactConflicts) limitations.push('Product facts contain contradictions.');

  return {
    targetProductId: input.productId || null,
    targetProductName: input.name || 'Craft Product',
    costAnalysis: cost,
    marketReference: market,
    reconciliation,
    confidence,
    trustMatrix,
    evidenceProvenance: provenance,
    artisanPriceComparison: {
      artisanPrice,
      suggestedPrice: sugP,
      fairPriceMin: minP ?? sugP,
      fairPriceMax: maxP ?? sugP,
      positionStatus,
      message,
    },
    reasoningFlow,
    assumptions,
    missingInformation,
    limitations,
  };
}
