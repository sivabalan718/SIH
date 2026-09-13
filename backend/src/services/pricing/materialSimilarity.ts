import { MatchState } from './types.js';
import { extractTokens, normalizeText } from './normalization.js';

export interface MaterialMatchResult {
  score: number;
  state: MatchState;
  explanation: string;
}

export const MATERIAL_SIMILARITY_VERSION = 'v1';

// Versioned Deterministic Material Relationship Matrix
const MATERIAL_RELATIONSHIPS_V1: Record<string, Record<string, { score: number; state: MatchState }>> = {
  clay: {
    clay: { score: 1.0, state: 'EXACT' },
    terracotta: { score: 0.85, state: 'STRONG_RELATED' },
    ceramic: { score: 0.70, state: 'PARTIAL' },
    earthenware: { score: 0.85, state: 'STRONG_RELATED' },
    stoneware: { score: 0.65, state: 'PARTIAL' },
    porcelain: { score: 0.50, state: 'PARTIAL' },
    wood: { score: 0.0, state: 'DIFFERENT' },
    cotton: { score: 0.0, state: 'DIFFERENT' },
    silk: { score: 0.0, state: 'DIFFERENT' },
    brass: { score: 0.0, state: 'DIFFERENT' },
    silver: { score: 0.0, state: 'DIFFERENT' },
    gold: { score: 0.0, state: 'DIFFERENT' },
  },
  terracotta: {
    terracotta: { score: 1.0, state: 'EXACT' },
    clay: { score: 0.85, state: 'STRONG_RELATED' },
    ceramic: { score: 0.70, state: 'PARTIAL' },
    earthenware: { score: 0.90, state: 'STRONG_RELATED' },
    stoneware: { score: 0.65, state: 'PARTIAL' },
    wood: { score: 0.0, state: 'DIFFERENT' },
    cotton: { score: 0.0, state: 'DIFFERENT' },
    brass: { score: 0.0, state: 'DIFFERENT' },
  },
  ceramic: {
    ceramic: { score: 1.0, state: 'EXACT' },
    porcelain: { score: 0.85, state: 'STRONG_RELATED' },
    stoneware: { score: 0.85, state: 'STRONG_RELATED' },
    terracotta: { score: 0.70, state: 'PARTIAL' },
    clay: { score: 0.70, state: 'PARTIAL' },
    earthenware: { score: 0.75, state: 'STRONG_RELATED' },
    glass: { score: 0.40, state: 'PARTIAL' },
    wood: { score: 0.0, state: 'DIFFERENT' },
  },
  cotton: {
    cotton: { score: 1.0, state: 'EXACT' },
    khadi: { score: 0.85, state: 'STRONG_RELATED' },
    linen: { score: 0.70, state: 'PARTIAL' },
    jute: { score: 0.50, state: 'PARTIAL' },
    silk: { score: 0.35, state: 'PARTIAL' },
    wool: { score: 0.30, state: 'PARTIAL' },
    polyester: { score: 0.20, state: 'PARTIAL' },
    clay: { score: 0.0, state: 'DIFFERENT' },
    wood: { score: 0.0, state: 'DIFFERENT' },
  },
  silk: {
    silk: { score: 1.0, state: 'EXACT' },
    mulberry: { score: 0.90, state: 'STRONG_RELATED' },
    tussar: { score: 0.90, state: 'STRONG_RELATED' },
    cotton: { score: 0.35, state: 'PARTIAL' },
    polyester: { score: 0.15, state: 'DIFFERENT' },
    clay: { score: 0.0, state: 'DIFFERENT' },
  },
  teak: {
    teak: { score: 1.0, state: 'EXACT' },
    wood: { score: 0.85, state: 'STRONG_RELATED' },
    rosewood: { score: 0.75, state: 'STRONG_RELATED' },
    sheesham: { score: 0.75, state: 'STRONG_RELATED' },
    bamboo: { score: 0.40, state: 'PARTIAL' },
    clay: { score: 0.0, state: 'DIFFERENT' },
  },
  wood: {
    wood: { score: 1.0, state: 'EXACT' },
    teak: { score: 0.85, state: 'STRONG_RELATED' },
    rosewood: { score: 0.85, state: 'STRONG_RELATED' },
    sheesham: { score: 0.85, state: 'STRONG_RELATED' },
    bamboo: { score: 0.50, state: 'PARTIAL' },
    clay: { score: 0.0, state: 'DIFFERENT' },
  },
  brass: {
    brass: { score: 1.0, state: 'EXACT' },
    bronze: { score: 0.85, state: 'STRONG_RELATED' },
    copper: { score: 0.75, state: 'STRONG_RELATED' },
    metal: { score: 0.80, state: 'STRONG_RELATED' },
    silver: { score: 0.40, state: 'PARTIAL' },
    clay: { score: 0.0, state: 'DIFFERENT' },
  },
};

export function evaluateMaterialSimilarity(targetMat?: string | null, candidateMat?: string | null): MaterialMatchResult {
  const tMatRaw = normalizeText(targetMat || '');
  const cMatRaw = normalizeText(candidateMat || '');

  if (!tMatRaw || !cMatRaw) {
    return {
      score: 0,
      state: 'MISSING',
      explanation: 'Material information is missing for comparison',
    };
  }

  if (tMatRaw === cMatRaw) {
    return {
      score: 1.0,
      state: 'EXACT',
      explanation: `Exact material match: ${targetMat}`,
    };
  }

  const tTokens = extractTokens(tMatRaw);
  const cTokens = extractTokens(cMatRaw);

  if (tTokens.length === 0 || cTokens.length === 0) {
    return {
      score: 0,
      state: 'MISSING',
      explanation: 'Material tokens missing',
    };
  }

  let bestScore = 0;
  let bestState: MatchState = 'DIFFERENT';

  for (const tTok of tTokens) {
    for (const cTok of cTokens) {
      if (tTok === cTok) {
        bestScore = Math.max(bestScore, 1.0);
        bestState = 'EXACT';
      } else if (MATERIAL_RELATIONSHIPS_V1[tTok]?.[cTok]) {
        const rel = MATERIAL_RELATIONSHIPS_V1[tTok][cTok];
        if (rel.score > bestScore) {
          bestScore = rel.score;
          bestState = rel.state;
        }
      }
    }
  }

  return {
    score: bestScore,
    state: bestState,
    explanation: `Material comparison (${targetMat} vs ${candidateMat}): ${bestState} (${bestScore})`,
  };
}
