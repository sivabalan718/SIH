import { CostAnalysis, MarketReference, PricingConfidence, ConfidenceLevel } from './types.js';

export function evaluateConfidence(
  cost: CostAnalysis,
  market: MarketReference,
  hasFactConflicts: boolean
): PricingConfidence {
  const reasons: string[] = [];
  let score = 0.5;

  if (hasFactConflicts) {
    return {
      score: 0.3,
      level: 'LOW',
      reasons: ['Product information conflicts detected; confidence capped at LOW until product facts are verified.'],
    };
  }

  // 1. Cost Completeness
  if (cost.costState === 'COMPLETE') {
    score += 0.25;
    reasons.push('Verified complete production cost inputs provided by artisan.');
  } else if (cost.costState === 'PARTIAL') {
    score += 0.10;
    reasons.push('Partial production cost inputs provided.');
  } else {
    score -= 0.15;
    reasons.push('Production cost inputs missing.');
  }

  // 2. Comparable Adequacy
  const validCount = market.validComparablesCount;
  const primaryCount = market.primaryCount;

  if (validCount >= 5 && primaryCount >= 2) {
    score += 0.25;
    reasons.push(`Strong market evidence sample: ${validCount} valid comparables (${primaryCount} Primary matches).`);
  } else if (validCount >= 3) {
    score += 0.15;
    reasons.push(`Moderate market evidence sample: ${validCount} valid comparables.`);
  } else if (validCount === 1 || validCount === 2) {
    score += 0.05;
    reasons.push(`Limited market evidence: only ${validCount} valid comparable listing(s) available.`);
  } else {
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

  const finalScore = Math.max(0.1, Math.min(1.0, Math.round(score * 100) / 100));

  // Determine Confidence Level with STRICT HARD REQUIREMENTS
  let level: ConfidenceLevel = 'MEDIUM';

  // HIGH HARD REQUIREMENTS:
  // Must have: >= 3 valid comparables, >= 1 Primary comparable, COMPLETE cost state, and score >= 0.75.
  // One comparable CANNOT become HIGH!
  if (finalScore >= 0.75 && validCount >= 3 && primaryCount >= 1 && cost.costState === 'COMPLETE') {
    level = 'HIGH';
  } else if (finalScore < 0.45 || validCount === 0 || cost.costState === 'UNAVAILABLE') {
    level = 'LOW';
  } else {
    level = 'MEDIUM';
  }

  return {
    score: finalScore,
    level,
    reasons,
  };
}
