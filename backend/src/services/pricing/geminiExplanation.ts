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
  const name = packet.targetProductName;
  const topComp = market.selectedComparables.find((c) => c.benchmarkEligible);
  const eligibleCount = market.validComparablesCount;

  if (language === 'ta') {
    if (knownCost > 0 && rec.isCostFloorActive) {
      return `உங்கள் "${name}" தயாரிப்பிற்கு சரிபார்க்கப்பட்ட உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')}. சந்தை விலைகள் உங்கள் குறைந்தபட்ச உற்பத்திச் செலவை விட குறைவாக உள்ளதால், M63 உங்கள் உழைப்பைப் பாதுகாக்கும் விதமாக ₹${sugP.toLocaleString('en-IN')} விலையை நிர்ணயித்துள்ளது.`;
    }
    if (knownCost > 0 && eligibleCount > 0) {
      return `உங்கள் "${name}" தயாரிப்பிற்கு சரிபார்க்கப்பட்ட உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')} மற்றும் அடிப்படை விலை ₹${cost.costAnchor.toLocaleString('en-IN')}. ${eligibleCount} ஒத்த சந்தை தயாரிப்புகளின் எடையிடப்பட்ட குறிப்பு விலை ₹${market.p50?.toLocaleString('en-IN') ?? '—'} அடிப்படையில், பரிந்துரைக்கப்பட்ட விலை ₹${sugP.toLocaleString('en-IN')} (நியாயமான வரம்பு ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}) ஆகும்.`;
    }
    return `உங்கள் தயாரிப்பின் உற்பத்திச் செலவு ₹${knownCost.toLocaleString('en-IN')} அடிப்படையில் பரிந்துரைக்கப்பட்ட விலை ₹${sugP.toLocaleString('en-IN')} (வரம்பு ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}).`;
  }

  if (language === 'hi') {
    if (knownCost > 0 && rec.isCostFloorActive) {
      return `आपके "${name}" उत्पाद की सत्यापित उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} है। बाज़ार मूल्य आपकी न्यूनतम लागत से कम होने के कारण, M63 लागत सुरक्षा के तहत ₹${sugP.toLocaleString('en-IN')} की अनुशंसा करता है।`;
    }
    if (knownCost > 0 && eligibleCount > 0) {
      return `आपके उत्पाद की सत्यापित उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} और लागत आधार ₹${cost.costAnchor.toLocaleString('en-IN')} है। ${eligibleCount} समान बाज़ार उत्पादों (भारित संदर्भ ₹${market.p50?.toLocaleString('en-IN') ?? '—'}) के आधार पर अनुशंसित मूल्य ₹${sugP.toLocaleString('en-IN')} (उचित सीमा ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}) है।`;
    }
    return `उत्पादन लागत ₹${knownCost.toLocaleString('en-IN')} के आधार पर अनुशंसित मूल्य ₹${sugP.toLocaleString('en-IN')} (उचित सीमा ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}) है।`;
  }

  // English
  if (knownCost > 0 && rec.isCostFloorActive) {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')}. Observed marketplace evidence is below your sustainable cost floor of ₹${cost.costFloor.toLocaleString('en-IN')}, so M63 anchors the recommendation to ₹${sugP.toLocaleString('en-IN')} to protect your production investment.`;
  }

  if (knownCost > 0 && eligibleCount === 1) {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')} and your cost-based anchor is ₹${cost.costAnchor.toLocaleString('en-IN')}. M63 found 1 eligible marketplace comparable with a similarity-weighted market reference of ₹${market.p50?.toLocaleString('en-IN') ?? '—'}. Because market evidence is sparse, M63 applies a limited market adjustment rather than following the observed listing directly. This results in a recommended price of ₹${sugP.toLocaleString('en-IN')} while keeping the recommendation above the verified production cost.`;
  }

  if (knownCost > 0 && eligibleCount > 1 && rec.pricingBasis === 'MARKET_SUPPORTED') {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')} and your cost-based anchor is ₹${cost.costAnchor.toLocaleString('en-IN')}. M63 identified ${eligibleCount} eligible marketplace comparables with a weighted market reference of ₹${market.p50?.toLocaleString('en-IN')}. Reconciling market evidence with your production anchor yields a recommended price of ₹${sugP.toLocaleString('en-IN')} (fair range ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}).`;
  }

  if (knownCost > 0) {
    return `Your verified production cost is ₹${knownCost.toLocaleString('en-IN')}. Marketplace comparables were limited or unavailable for this specific product, so M63 anchored the recommendation to your production economics with a cost floor of ₹${cost.costFloor.toLocaleString('en-IN')}, yielding a suggested price of ₹${sugP.toLocaleString('en-IN')} (fair range ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}).`;
  }

  if (market.p50 !== null) {
    return `M63 recommends a suggested price of ₹${sugP.toLocaleString('en-IN')} (fair range ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}) derived from a weighted market reference of ₹${market.p50.toLocaleString('en-IN')} across ${eligibleCount} observed marketplace prices. Production cost breakdown was not provided.`;
  }

  return `M63 suggests a baseline fair price of ₹${sugP.toLocaleString('en-IN')} (fair range ₹${minP.toLocaleString('en-IN')}–₹${maxP.toLocaleString('en-IN')}) based on general category benchmarks.`;
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

  allowedNumbers.add(packet.costAnalysis.knownCost);
  allowedNumbers.add(packet.costAnalysis.costFloor);
  allowedNumbers.add(packet.costAnalysis.costAnchor);
  if (packet.costAnalysis.materialCost) allowedNumbers.add(packet.costAnalysis.materialCost);
  if (packet.costAnalysis.labourCost) allowedNumbers.add(packet.costAnalysis.labourCost);
  if (packet.costAnalysis.otherExpenses) allowedNumbers.add(packet.costAnalysis.otherExpenses);

  allowedNumbers.add(packet.reconciliation.suggestedPrice);
  allowedNumbers.add(packet.reconciliation.fairPriceMin);
  allowedNumbers.add(packet.reconciliation.fairPriceMax);
  allowedNumbers.add(Math.abs(packet.reconciliation.marketAdjustment));
  allowedNumbers.add(Math.round(packet.reconciliation.evidenceQualityAlpha * 100));

  if (packet.marketReference.p50) allowedNumbers.add(packet.marketReference.p50);
  if (packet.marketReference.p25) allowedNumbers.add(packet.marketReference.p25);
  if (packet.marketReference.p75) allowedNumbers.add(packet.marketReference.p75);
  if (packet.marketReference.observedMinPrice) allowedNumbers.add(packet.marketReference.observedMinPrice);
  if (packet.marketReference.observedMaxPrice) allowedNumbers.add(packet.marketReference.observedMaxPrice);

  if (packet.artisanPriceComparison.artisanPrice) allowedNumbers.add(packet.artisanPriceComparison.artisanPrice);

  for (const comp of packet.marketReference.selectedComparables) {
    allowedNumbers.add(comp.price);
    allowedNumbers.add(comp.similarityPercentage);
  }

  // Common count numbers allowed (e.g. 1, 2, 3, 5, 8, 25, 50, 75, 100)
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

  const prompt = `You are the M63 AI Smart Fair Pricing Intelligence Engine.
Your role is strictly to explain the backend's deterministic pricing result to an artisan in simple, respectful language (${language}).

STRICT RULES:
1. DO NOT calculate or change any prices.
2. DO NOT invent external market trends, competitor prices, or demand data.
3. Use ONLY numbers provided in the Evidence Packet.
4. NEVER use the term "market average". Use "weighted market reference" or "observed marketplace prices".

EVIDENCE PACKET:
- Target Product: ${packet.targetProductName}
- Known Production Cost: ₹${packet.costAnalysis.knownCost}
- Cost Floor: ₹${packet.costAnalysis.costFloor}
- Cost Anchor: ₹${packet.costAnalysis.costAnchor}
- Weighted Market Reference (P50): ${packet.marketReference.p50 ? `₹${packet.marketReference.p50}` : 'Unavailable'}
- Fair Price Range: ₹${packet.reconciliation.fairPriceMin} – ₹${packet.reconciliation.fairPriceMax}
- Suggested Price: ₹${packet.reconciliation.suggestedPrice}
- Market Adjustment: ${packet.reconciliation.marketAdjustment >= 0 ? `+₹${packet.reconciliation.marketAdjustment}` : `−₹${Math.abs(packet.reconciliation.marketAdjustment)}`}
- Pricing Basis: ${packet.reconciliation.pricingBasis}
- Confidence: ${packet.confidence.level}
- Comparables Count: ${packet.marketReference.validComparablesCount}
- Top Comparable: ${packet.marketReference.selectedComparables[0] ? `[${packet.marketReference.selectedComparables[0].productName}] ₹${packet.marketReference.selectedComparables[0].price} (${packet.marketReference.selectedComparables[0].similarityPercentage}% similarity)` : 'None'}

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
