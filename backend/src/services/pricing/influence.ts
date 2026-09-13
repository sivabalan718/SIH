import { PRICING_CONFIG } from './config.js';

export interface CalculatedInfluence {
  productId: string;
  similarity: number;
  rawInfluence: number;
  normalizedInfluence: number;
  cappedInfluence: number;
  priceInfluenceLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

export function calculatePriceInfluence(items: Array<{ productId: string; similarity: number }>): Map<string, CalculatedInfluence> {
  const result = new Map<string, CalculatedInfluence>();

  if (items.length === 0) return result;

  // 1. Calculate raw influence = S_j ^ 2
  const rawList = items.map((item) => {
    const raw = Math.pow(item.similarity, 2);
    return {
      productId: item.productId,
      similarity: item.similarity,
      rawInfluence: raw,
    };
  });

  const sumRaw = rawList.reduce((acc, x) => acc + x.rawInfluence, 0);

  // 2. Initial normalized influence
  const normList = rawList.map((x) => ({
    ...x,
    normalizedInfluence: sumRaw > 0 ? x.rawInfluence / sumRaw : 1 / items.length,
  }));

  // 3. Apply Anti-Dominance Cap (MAX_COMPARABLE_INFLUENCE = 0.45)
  const maxCap = PRICING_CONFIG.maxComparableInfluence;
  
  let cappedWithVal: Array<typeof normList[0] & { cappedInfluence: number }>;

  const hasExceededCap = normList.some((x) => x.normalizedInfluence > maxCap);

  if (hasExceededCap && normList.length > 1) {
    let excessWeight = 0;
    let uncappedWeightSum = 0;

    for (const x of normList) {
      if (x.normalizedInfluence > maxCap) {
        excessWeight += x.normalizedInfluence - maxCap;
      } else {
        uncappedWeightSum += x.normalizedInfluence;
      }
    }

    cappedWithVal = normList.map((x) => {
      if (x.normalizedInfluence > maxCap) {
        return { ...x, cappedInfluence: maxCap };
      }
      const extra = uncappedWeightSum > 0 ? (x.normalizedInfluence / uncappedWeightSum) * excessWeight : 0;
      return { ...x, cappedInfluence: x.normalizedInfluence + extra };
    });
  } else {
    cappedWithVal = normList.map((x) => ({ ...x, cappedInfluence: x.normalizedInfluence }));
  }

  // Renormalize capped values to strictly sum to 1.0
  const sumCapped = cappedWithVal.reduce((acc, x) => acc + x.cappedInfluence, 0);
  const finalList = cappedWithVal.map((x) => ({
    ...x,
    cappedInfluence: sumCapped > 0 ? x.cappedInfluence / sumCapped : 1 / items.length,
  }));

  for (const x of finalList) {
    let level: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let explanation = '';

    if (x.similarity >= 0.85) {
      level = 'VERY_HIGH';
      explanation = 'Very High — closely matches product type, material, craft technique, and quantity scale.';
    } else if (x.similarity >= 0.70) {
      level = 'HIGH';
      explanation = 'High — strong match across identity, material, and craft specifications.';
    } else if (x.similarity >= 0.55) {
      level = 'MEDIUM';
      explanation = 'Medium — several important characteristics match, but has minor attribute differences.';
    } else {
      level = 'LOW';
      explanation = 'Low — contextual reference with notable differences in material, scale, or product type.';
    }

    result.set(x.productId, {
      productId: x.productId,
      similarity: x.similarity,
      rawInfluence: x.rawInfluence,
      normalizedInfluence: x.normalizedInfluence,
      cappedInfluence: x.cappedInfluence,
      priceInfluenceLevel: level,
      explanation,
    });
  }

  return result;
}
