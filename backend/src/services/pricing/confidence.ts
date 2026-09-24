import { CostAnalysis, MarketReference, ReconciliationResult, PricingConfidence, ConfidenceLevel } from './types.js';

export function evaluateConfidence(
  cost: CostAnalysis,
  market: MarketReference,
  hasFactConflicts: boolean,
  reconciliation?: ReconciliationResult
): PricingConfidence {
  const reasons: string[] = [];
  let score = 0.5;

  // 1. Cost Evidence Confidence
  let costConfidence: ConfidenceLevel = 'LOW';
  if (cost.costState === 'COMPLETE') {
    costConfidence = 'HIGH';
    score += 0.25;
    reasons.push('Verified complete production cost inputs provided by artisan.');
  } else if (cost.costState === 'PARTIAL') {
    costConfidence = 'MEDIUM';
    score += 0.10;
    reasons.push('Partial production cost inputs provided.');
  } else {
    costConfidence = 'LOW';
    score -= 0.15;
    reasons.push('Production cost inputs missing.');
  }

  // 2. Market Evidence Confidence
  const validCount = market.validComparablesCount;
  const primaryCount = market.primaryCount;
  let marketConfidence: ConfidenceLevel = 'LOW';

  if (validCount >= 5 && primaryCount >= 2) {
    marketConfidence = 'HIGH';
    score += 0.25;
    reasons.push(`Strong market evidence sample: ${validCount} valid comparables (${primaryCount} Primary matches).`);
  } else if (validCount >= 3) {
    marketConfidence = 'MEDIUM';
    score += 0.15;
    reasons.push(`Moderate market evidence sample: ${validCount} valid comparables.`);
  } else if (validCount === 1 || validCount === 2) {
    marketConfidence = 'LOW';
    score += 0.05;
    reasons.push(`Limited market evidence: only ${validCount} valid comparable listing(s) available.`);
  } else {
    marketConfidence = 'LOW';
    score -= 0.20;
    reasons.push('No relevant market comparables available.');
  }

  // 3. Price Agreement (Spread between P25 and P75)
  if (market.p25 !== null && market.p75 !== null && market.p50 !== null && market.p50 > 0) {
    const spreadRatio = (market.p75 - market.p25) / market.p50;
    if (spreadRatio <= 0.35) {
      score += 0.10;
      reasons.push('Market prices tightly cluster around the median.');
    } else if (spreadRatio > 0.80) {
      score -= 0.10;
      reasons.push('High price variation observed among market comparables.');
    }
  }

  // 4. Check for Market-Cost Divergence / Mismatch
  const hasMismatch = reconciliation?.hasMarketCostMismatch ||
    (market.p50 !== null && cost.costBasedPrice > 0 && Math.abs(market.p50 - cost.costBasedPrice) / cost.costBasedPrice > 0.25);

  if (hasMismatch) {
    score -= 0.15;
    reasons.push('Substantial divergence between observed market prices and production cost floor.');
  }

  const finalScore = Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));

  // Determine Overall Recommendation Confidence Level with STRICT HARD REQUIREMENTS
  let level: ConfidenceLevel = 'MEDIUM';

  if (hasFactConflicts) {
    level = 'LOW';
  } else if (hasMismatch) {
    // If major divergence between market and cost, cap overall confidence at MEDIUM (or LOW if sparse data)
    if (validCount < 3 || cost.costState === 'UNAVAILABLE') {
      level = 'LOW';
    } else {
      level = 'MEDIUM';
    }
  } else if (finalScore >= 0.75 && validCount >= 3 && primaryCount >= 1 && cost.costState === 'COMPLETE') {
    level = 'HIGH';
  } else if (finalScore < 0.45 || validCount === 0 || cost.costState === 'UNAVAILABLE') {
    level = 'LOW';
  } else {
    level = 'MEDIUM';
  }

  return {
    score: finalScore,
    level,
    costConfidence,
    marketConfidence,
    reasons,
  };
}
