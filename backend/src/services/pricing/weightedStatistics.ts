export interface WeightedStatsResult {
  p25: number | null;
  p50: number | null; // Similarity-Weighted Median (Market Reference)
  p75: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}

export function calculateWeightedStatistics(
  items: Array<{ price: number; weight: number }>
): WeightedStatsResult {
  if (!items || items.length === 0) {
    return { p25: null, p50: null, p75: null, minPrice: null, maxPrice: null };
  }

  // Filter invalid prices
  const validItems = items.filter((x) => typeof x.price === 'number' && x.price > 0 && typeof x.weight === 'number' && x.weight > 0);

  if (validItems.length === 0) {
    return { p25: null, p50: null, p75: null, minPrice: null, maxPrice: null };
  }

  // Sort ascending by price
  const sorted = [...validItems].sort((a, b) => a.price - b.price);

  const totalWeight = sorted.reduce((sum, x) => sum + x.weight, 0);
  if (totalWeight <= 0) {
    return { p25: null, p50: null, p75: null, minPrice: null, maxPrice: null };
  }

  // Single item case
  if (sorted.length === 1) {
    const p = sorted[0].price;
    return { p25: p, p50: p, p75: p, minPrice: p, maxPrice: p };
  }

  function getWeightedPercentile(percentile: number): number {
    const targetWeight = totalWeight * (percentile / 100);
    let cumulative = 0;

    for (let i = 0; i < sorted.length; i++) {
      cumulative += sorted[i].weight;
      if (cumulative >= targetWeight) {
        return sorted[i].price;
      }
    }

    return sorted[sorted.length - 1].price;
  }

  const p25 = getWeightedPercentile(25);
  const p50 = getWeightedPercentile(50);
  const p75 = getWeightedPercentile(75);

  return {
    p25: Math.round(p25),
    p50: Math.round(p50),
    p75: Math.round(p75),
    minPrice: sorted[0].price,
    maxPrice: sorted[sorted.length - 1].price,
  };
}
