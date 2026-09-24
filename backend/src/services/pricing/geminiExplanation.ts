import { PricingEvidencePacket, PricingLanguage } from './types.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface ExplanationResult {
  explanation: string;
  explanationGeneratedBy: 'GEMINI_VALIDATED' | 'DETERMINISTIC_FALLBACK';
}

export function generateDeterministicExplanation(
  packet: PricingEvidencePacket,
  language: PricingLanguage = 'en'
): string {
  const cost = packet.costAnalysis;
  const rec = packet.reconciliation;
  const market = packet.marketReference;
  const sugP = rec.suggestedPrice;
  const minP = rec.fairPriceMin;
  const maxP = rec.fairPriceMax;
  const knownCost = cost.knownCost;
  const costBasedP = cost.costBasedPrice || cost.costFloor || cost.costAnchor;
  const name = packet.targetProductName;
  const eligibleCount = market.validComparablesCount;
  const rawMarketP = Math.round(rec.rawMarketAdjustedPrice);
  const marketRef = market.p50 ? Math.round(market.p50) : null;

  if (language === 'ta') {
    if (knownCost > 0 && rec.isCostFloorActive) {
      return `உங்கள் "${name}" தயாரிப்பிற்கு சரிபார்க்கப்பட்ட உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')}. 25% லாப வரம்பு சேர்த்து அடிப்படை விலை ₹${costBasedP.toLocaleString('en-IN')} ஆகும். சந்தை விலைகள் (₹${marketRef?.toLocaleString('en-IN') ?? rawMarketP.toLocaleString('en-IN')}) குறைவாக உள்ளதால், M63 உங்கள் தயாரிப்புச் செலவைப் பாதுகாக்கும் விதமாக ₹${sugP.toLocaleString('en-IN')} விலையை நிர்ணயித்துள்ளது.`;
    }
    if (knownCost > 0 && eligibleCount > 0) {
      return `உங்கள் "${name}" தயாரிப்பிற்கு சரிபார்க்கப்பட்ட உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')} மற்றும் 25% லாப வரம்புடனான விலை ₹${costBasedP.toLocaleString('en-IN')}. ${eligibleCount} ஒத்த சந்தை தயாரிப்புகளின் எடையிடப்பட்ட குறிப்பு விலை ₹${marketRef?.toLocaleString('en-IN') ?? '—'} அடிப்படையில், பரிந்துரைக்கப்பட்ட விலை ₹${sugP.toLocaleString('en-IN')} ${minP && maxP ? `(சந்தை வரம்பு ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')})` : ''} ஆகும்.`;
    }
    return `உங்கள் தயாரிப்பின் உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')} (25% லாப வரம்பு ₹${costBasedP.toLocaleString('en-IN')}) அடிப்படையில் பரிந்துரைக்கப்பட்ட விலை ₹${sugP.toLocaleString('en-IN')} ஆகும்.`;
  }

  if (language === 'hi') {
    if (knownCost > 0 && rec.isCostFloorActive) {
      return `आपके "${name}" उत्पाद की सत्यापित उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} है। 25% मार्कअप के साथ लागत-आधारित मूल्य ₹${costBasedP.toLocaleString('en-IN')} है। बाज़ार मूल्य (₹${marketRef?.toLocaleString('en-IN') ?? rawMarketP.toLocaleString('en-IN')}) कम होने के कारण, M63 टिकाऊ लागत सुरक्षा के तहत ₹${sugP.toLocaleString('en-IN')} की अनुशंसा करता है।`;
    }
    if (knownCost > 0 && eligibleCount > 0) {
      return `आपके उत्पाद की सत्यापित उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} और 25% मार्कअप के साथ मूल्य ₹${costBasedP.toLocaleString('en-IN')} है। ${eligibleCount} समान बाज़ार उत्पादों (भारित संदर्भ ₹${marketRef?.toLocaleString('en-IN') ?? '—'}) के आधार पर अनुशंसित मूल्य ₹${sugP.toLocaleString('en-IN')} ${minP && maxP ? `(उचित बाज़ार सीमा ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')})` : ''} है।`;
    }
    return `उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} (लागत-आधारित मूल्य ₹${costBasedP.toLocaleString('en-IN')}) के आधार पर अनुशंसित मूल्य ₹${sugP.toLocaleString('en-IN')} है।`;
  }

  // English
  if (knownCost > 0 && (rec.isCostFloorActive || rec.hasMarketCostMismatch)) {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')} (sustainable cost floor: ₹${costBasedP.toLocaleString('en-IN')}). Observed marketplace reference is ₹${marketRef?.toLocaleString('en-IN') ?? rawMarketP.toLocaleString('en-IN')}. Because raw market alignment falls below your production cost, M63 applies cost-floor protection to recommend ₹${sugP.toLocaleString('en-IN')}, ensuring your production expenses and markup are covered.`;
  }

  if (knownCost > 0 && eligibleCount === 1) {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')} and your cost-based price (25% markup) is ₹${costBasedP.toLocaleString('en-IN')}. M63 found 1 eligible marketplace comparable with a similarity-weighted market reference of ₹${marketRef?.toLocaleString('en-IN') ?? '—'}. M63 applies a limited market adjustment resulting in a recommended price of ₹${sugP.toLocaleString('en-IN')}.`;
  }

  if (knownCost > 0 && eligibleCount > 1 && rec.pricingBasis === 'MARKET_SUPPORTED') {
    const rangeText = minP && maxP ? ` (observed market range ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')})` : '';
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')} and your cost-based price (25% markup) is ₹${costBasedP.toLocaleString('en-IN')}. M63 identified ${eligibleCount} eligible marketplace comparables with a weighted market reference of ₹${marketRef?.toLocaleString('en-IN')}. Reconciling market evidence with your cost floor yields a recommended price of ₹${sugP.toLocaleString('en-IN')}${rangeText}.`;
  }

  if (knownCost > 0) {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')}. Marketplace comparables were limited, so M63 anchored the recommendation to your production economics with a 25% markup floor of ₹${costBasedP.toLocaleString('en-IN')}, yielding a suggested price of ₹${sugP.toLocaleString('en-IN')}.`;
  }

  if (market.p50 !== null) {
    const rangeText = minP && maxP ? ` (observed market range ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')})` : '';
    return `M63 recommends a suggested price of ₹${sugP.toLocaleString('en-IN')}${rangeText} derived from a weighted market reference of ₹${marketRef?.toLocaleString('en-IN')} across ${eligibleCount} observed marketplace prices.`;
  }

  return `M63 suggests a baseline fair price of ₹${sugP.toLocaleString('en-IN')} based on general category benchmarks.`;
}

export function validateGeminiExplanation(explanation: string, packet: PricingEvidencePacket): boolean {
  if (!explanation || explanation.trim().length === 0) return false;

  // Never allow misleading terminology
  const lower = explanation.toLowerCase();
  if (lower.includes('market average') || lower.includes('historical transaction')) {
    logger.warn('[GeminiExplanation] Rejected Gemini explanation containing prohibited terminology (market average/historical transaction).');
    return false;
  }

  // Extract all numbers mentioned in explanation
  const matches = explanation.match(/₹?\s*(\d+[\d,]*)/g) || [];
  const numbersInText = matches.map((m) => Number(m.replace(/[^\d]/g, ''))).filter((n) => n > 0);

  if (numbersInText.length === 0) return true;

  // Build whitelist of allowed numbers from evidence packet
  const allowedNumbers = new Set<number>();

  // Helper to add number and its integer variants (floor, ceil, round)
  const addNum = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return;
    allowedNumbers.add(val);

    allowedNumbers.add(Math.floor(val));
    allowedNumbers.add(Math.ceil(val));
    allowedNumbers.add(Math.round(val));
  };

  addNum(packet.costAnalysis.knownCost);
  addNum(packet.costAnalysis.costBasedPrice);
  addNum(packet.costAnalysis.costFloor);
  addNum(packet.costAnalysis.costAnchor);
  addNum(packet.costAnalysis.markupAmount);
  addNum(packet.costAnalysis.materialCost);
  addNum(packet.costAnalysis.labourCost);
  addNum(packet.costAnalysis.otherExpenses);

  addNum(packet.reconciliation.suggestedPrice);
  addNum(packet.reconciliation.fairPriceMin);
  addNum(packet.reconciliation.fairPriceMax);
  addNum(packet.reconciliation.rawMarketAdjustedPrice);
  addNum(Math.abs(packet.reconciliation.marketAdjustment));
  addNum(Math.round(packet.reconciliation.evidenceQualityAlpha * 100));

  addNum(packet.marketReference.p50);
  addNum(packet.marketReference.p25);
  addNum(packet.marketReference.p75);
  addNum(packet.marketReference.observedMinPrice);
  addNum(packet.marketReference.observedMaxPrice);

  addNum(packet.artisanPriceComparison.artisanPrice);

  for (const comp of packet.marketReference.selectedComparables) {
    addNum(comp.price);
    addNum(comp.similarityPercentage);
  }

  // Common count/percentage numbers allowed
  const commonCounts = [1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 25, 30, 50, 55, 70, 75, 85, 100];
  for (const c of commonCounts) allowedNumbers.add(c);

  for (const num of numbersInText) {
    if (!allowedNumbers.has(num)) {
      logger.warn(`[GeminiExplanation] Rejected Gemini explanation containing unverified number: ₹${num}`);
      return false; // Reject if hallucinated number found!
    }
  }

  return true;
}

export async function generatePricingExplanation(
  packet: PricingEvidencePacket,
  language: PricingLanguage = 'en'
): Promise<ExplanationResult> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    return {
      explanation: generateDeterministicExplanation(packet, language),
      explanationGeneratedBy: 'DETERMINISTIC_FALLBACK',
    };
  }

  const minRangeStr = packet.reconciliation.fairPriceMin ? `₹${packet.reconciliation.fairPriceMin}` : 'Unavailable';
  const maxRangeStr = packet.reconciliation.fairPriceMax ? `₹${packet.reconciliation.fairPriceMax}` : 'Unavailable';

  const prompt = `You are the M63 AI Smart Fair Pricing Intelligence Engine.
Your role is strictly to explain the backend's deterministic pricing result to an artisan in simple, respectful language (${language}).

STRICT RULES:
1. DO NOT calculate or change any prices.
2. DO NOT invent external market trends, competitor prices, or demand data.
3. Use ONLY numbers provided in the Evidence Packet.
4. NEVER use the term "market average". Use "weighted market reference" or "observed marketplace prices".
5. If Cost Floor Protection is active, explain that the recommendation is cost-protected to cover production costs rather than claiming it is the market's valuation.

EVIDENCE PACKET:
- Target Product: ${packet.targetProductName}
- Known Production Cost: ₹${packet.costAnalysis.knownCost}
- Cost-Based Price (25% Markup Floor): ₹${packet.costAnalysis.costBasedPrice || packet.costAnalysis.costFloor}
- Weighted Market Reference (P50): ${packet.marketReference.p50 ? `₹${packet.marketReference.p50}` : 'Unavailable'}
- Raw Market-Adjusted Price: ₹${Math.round(packet.reconciliation.rawMarketAdjustedPrice)}
- Observed Market Range: ${minRangeStr} – ${maxRangeStr}
- Suggested Recommended Price: ₹${packet.reconciliation.suggestedPrice}
- Market Adjustment: ${packet.reconciliation.marketAdjustment >= 0 ? `+₹${packet.reconciliation.marketAdjustment}` : `−₹${Math.abs(packet.reconciliation.marketAdjustment)}`}
- Cost Floor Applied / Active: ${packet.reconciliation.isCostFloorActive ? 'Yes (Protected at sustainable floor)' : 'No'}
- Market-Cost Mismatch: ${packet.reconciliation.hasMarketCostMismatch ? 'Yes' : 'No'}
- Pricing Basis: ${packet.reconciliation.pricingBasis}
- Confidence: ${packet.confidence.level}
- Comparables Count: ${packet.marketReference.validComparablesCount}

Write a 2-3 sentence artisan-friendly explanation describing why ₹${packet.reconciliation.suggestedPrice} was recommended. Return JSON: {"explanation": "..."}`;

  const models = ['gemini-3.5-flash-lite', env.geminiLlmModel, 'gemini-3.6-flash'].filter(Boolean);

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) continue;

      const json: any = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const text = parsed.explanation || '';

      if (validateGeminiExplanation(text, packet)) {
        return {
          explanation: text,
          explanationGeneratedBy: 'GEMINI_VALIDATED',
        };
      }
    } catch (e) {}
  }

  return {
    explanation: generateDeterministicExplanation(packet, language),
    explanationGeneratedBy: 'DETERMINISTIC_FALLBACK',
  };
}
