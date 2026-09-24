import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { DeterministicReviewStats, ProductReviewRecord } from '../review.service.js';

export interface FeedbackInsightResult {
  summary: string;
  positive_themes: string[];
  improvement_themes: string[];
  evidence_count: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  limitations: string[];
}

/**
 * Deterministic fallback generator for review statistics & evidence.
 * Grounded 100% in actual verified reviews.
 */
export function generateDeterministicFallback(
  productName: string,
  reviews: ProductReviewRecord[],
  language: 'en' | 'ta' | 'hi' = 'en'
): FeedbackInsightResult {
  const count = reviews.length;

  if (count === 0) {
    return {
      summary:
        language === 'ta'
          ? 'இன்னும் சரிபார்க்கப்பட்ட வாடிக்கையாளர் கருத்துகள் எதுவும் இல்லை.'
          : language === 'hi'
          ? 'अभी तक कोई सत्यापित ग्राहक प्रतिक्रिया नहीं मिली है।'
          : 'No verified customer feedback available yet.',
      positive_themes: [],
      improvement_themes: [],
      evidence_count: 0,
      confidence: 'LOW',
      limitations: [
        language === 'ta'
          ? 'வழங்கப்பட்ட ஆர்டர்களுக்கு வாடிக்கையாளர் மதிப்புரைகள் பெறப்பட்டதும் நுண்ணறிவுகள் உருவாகும்.'
          : language === 'hi'
          ? 'वितरित किए गए ऑर्डर के लिए समीक्षाएं मिलने पर AI अंतर्दृष्टि दिखाई देगी।'
          : 'Customer feedback insights will generate automatically as delivered orders receive verified reviews.',
      ],
    };
  }

  const posThemes: string[] = [];
  const impThemes: string[] = [];
  let sum = 0;

  for (const r of reviews) {
    sum += r.rating;
    if (r.review_text && r.review_text.trim()) {
      if (r.rating >= 4 && !posThemes.includes(r.review_text.trim())) {
        posThemes.push(r.review_text.trim());
      } else if (r.rating <= 3 && !impThemes.includes(r.review_text.trim())) {
        impThemes.push(r.review_text.trim());
      }
    }
  }

  const avg = Math.round((sum / count) * 10) / 10;
  const positivePercentage = Math.round((reviews.filter((r) => r.rating >= 4).length / count) * 100);

  if (count <= 2) {
    return {
      summary:
        language === 'ta'
          ? `வரையறுக்கப்பட்ட வாடிக்கையாளர் கருத்துகள் மட்டுமே கிடைத்துள்ளன (${count} மதிப்புரை). நம்பகமான வடிவங்களைக் கண்டறிய கூடுதல் மதிப்புரைகள் தேவை.`
          : language === 'hi'
          ? `सीमित ग्राहक प्रतिक्रिया उपलब्ध है (${count} समीक्षा)। विश्वसनीय पैटर्न की पहचान के लिए अधिक समीक्षाओं की आवश्यकता है।`
          : `Limited customer feedback is available (${count} review${count > 1 ? 's' : ''}). More reviews are needed to identify reliable patterns.`,
      positive_themes: posThemes.slice(0, 2),
      improvement_themes: impThemes.slice(0, 2),
      evidence_count: count,
      confidence: 'LOW',
      limitations: [
        `Based on limited feedback sample (${count} review${count > 1 ? 's' : ''}). Patterns may evolve as more customer orders are delivered.`,
      ],
    };
  }

  const summary =
    language === 'ta'
      ? `${count} சரிபார்க்கப்பட்ட வாடிக்கையாளர் மதிப்புரைகளின்படி, ${productName} சராசரி மதிப்பீடு 5க்கு ${avg} ஆகும் (${positivePercentage}% நேர்மறை).`
      : language === 'hi'
      ? `${count} सत्यापित ग्राहक समीक्षाओं के आधार पर, ${productName} की औसत रेटिंग 5 में से ${avg} है (${positivePercentage}% सकारात्मक)।`
      : `Based on ${count} verified customer reviews, ${productName || 'this product'} has an average rating of ${avg} out of 5 stars (${positivePercentage}% positive satisfaction).`;

  return {
    summary,
    positive_themes: posThemes.slice(0, 3),
    improvement_themes: impThemes.slice(0, 3),
    evidence_count: count,
    confidence: count >= 5 ? 'HIGH' : 'MEDIUM',
    limitations: [`Calculated deterministically from ${count} verified customer reviews.`],
  };
}

/**
 * Generate evidence-grounded AI feedback insights from actual verified customer reviews.
 * Adheres strictly to ground truth: no invented opinions, claims, or unmentioned issues.
 */
export async function generateFeedbackInsight(
  statsOrName: DeterministicReviewStats | string,
  reviewsOrLang?: ProductReviewRecord[] | ('en' | 'ta' | 'hi'),
  language: 'en' | 'ta' | 'hi' = 'en'
): Promise<FeedbackInsightResult> {
  let stats: DeterministicReviewStats;
  let lang: 'en' | 'ta' | 'hi' = language;
  let productName = 'Handcrafted Item';

  if (typeof statsOrName === 'string') {
    productName = statsOrName;
    const reviews = Array.isArray(reviewsOrLang) ? reviewsOrLang : [];
    lang = (typeof language === 'string' ? language : 'en') as 'en' | 'ta' | 'hi';

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
    const pos = total > 0 ? Math.round((reviews.filter((r) => r.rating >= 4).length / total) * 100) : 0;

    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const star = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      dist[star] = (dist[star] || 0) + 1;
    }

    stats = {
      total_reviews: total,
      average_rating: avg,
      positive_percentage: pos,
      rating_distribution: dist,
      recent_reviews: reviews,
    };
  } else {
    stats = statsOrName;
    lang = (typeof reviewsOrLang === 'string' ? reviewsOrLang : 'en') as 'en' | 'ta' | 'hi';
  }

  const reviews = stats.recent_reviews || [];
  const count = stats.total_reviews;

  // 0 Reviews Fallback
  if (count === 0) {
    return generateDeterministicFallback(productName, [], lang);
  }

  // 1-2 Reviews Fallback
  if (count <= 2) {
    return generateDeterministicFallback(productName, reviews, lang);
  }

  // 3+ Reviews: Attempt Gemini Reasoning with Strict Evidence Grounding
  if (env.geminiApiKey) {
    try {
      const insight = await callGeminiFeedbackIntelligence(stats, reviews, lang);
      if (insight) return insight;
    } catch (err: any) {
      logger.warn('[FeedbackIntelligence] Gemini API notice, falling back to deterministic review summary:', err.message);
    }
  }

  // Deterministic Fallback Engine for 3+ Reviews
  return generateDeterministicFallback(productName, reviews, lang);
}

/**
 * Call Gemini API with strict prompt instructions enforcing evidence grounding.
 * NEVER sends private customer information (email, phone, address, auth ID).
 */
async function callGeminiFeedbackIntelligence(
  stats: DeterministicReviewStats,
  reviews: ProductReviewRecord[],
  language: 'en' | 'ta' | 'hi'
): Promise<FeedbackInsightResult | null> {
  // Pass ONLY public safe review text and ratings. Strip customer identity.
  const reviewEvidence = reviews.map((r, i) => ({
    index: i + 1,
    rating: r.rating,
    text: r.review_text || '(Rating only, no review text provided)',
  }));

  const systemPrompt = `You are the M63 Customer Feedback Intelligence Engine. Your sole task is to summarize ACTUAL verified customer reviews for an artisan product.

CRITICAL GROUNDING RULES:
1. Use ONLY the supplied customer reviews evidence below. Do NOT invent, assume, or fabricate customer opinions, product complaints, or features not stated in the reviews.
2. If a customer complaint or theme appears only ONCE, do NOT describe it as a general trend.
3. Do NOT claim quality, delivery, or packaging issues unless explicitly written in the review texts.
4. Output MUST be valid JSON strictly adhering to the schema below.

JSON Schema:
{
  "summary": "Concise 1-2 sentence overall customer feedback summary in ${language === 'ta' ? 'Tamil' : language === 'hi' ? 'Hindi' : 'English'}",
  "positive_themes": ["theme 1", "theme 2"],
  "improvement_themes": ["improvement 1"],
  "evidence_count": ${stats.total_reviews},
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "limitations": ["Based on ${stats.total_reviews} verified customer reviews."]
}
`;

  const userPrompt = `Product Review Statistics:
- Total Reviews: ${stats.total_reviews}
- Average Rating: ${stats.average_rating} / 5.0
- Positive Satisfaction Rate: ${stats.positive_percentage}%

Customer Review Evidence:
${JSON.stringify(reviewEvidence, null, 2)}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP error ${response.status}`);
  }

  const resJson = (await response.json()) as any;
  const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText);
  return {
    summary: parsed.summary || `Based on ${stats.total_reviews} reviews with average rating of ${stats.average_rating}/5.`,
    positive_themes: Array.isArray(parsed.positive_themes) ? parsed.positive_themes : [],
    improvement_themes: Array.isArray(parsed.improvement_themes) ? parsed.improvement_themes : [],
    evidence_count: stats.total_reviews,
    confidence: stats.total_reviews >= 5 ? 'HIGH' : 'MEDIUM',
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [`Based on ${stats.total_reviews} verified customer reviews.`],
  };
}
