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
 * Generate evidence-grounded AI feedback insights from actual verified customer reviews.
 * Adheres strictly to ground truth: no invented opinions, claims, or unmentioned issues.
 */
export async function generateFeedbackInsight(
  stats: DeterministicReviewStats,
  language: 'en' | 'ta' | 'hi' = 'en'
): Promise<FeedbackInsightResult> {
  const reviews = stats.recent_reviews || [];
  const count = stats.total_reviews;

  // 0 Reviews Fallback
  if (count === 0) {
    return {
      summary:
        language === 'ta'
          ? 'இன்னும் வாடிக்கையாளர் கருத்துகள் எதுவும் இல்லை.'
          : language === 'hi'
          ? 'अभी तक कोई ग्राहक प्रतिक्रिया नहीं मिली है।'
          : 'No customer feedback yet.',
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

  // 1-2 Reviews Fallback (Limited sample size warning)
  if (count <= 2) {
    const texts = reviews.map((r) => r.review_text).filter(Boolean) as string[];
    const posThemes: string[] = [];
    const impThemes: string[] = [];

    for (const r of reviews) {
      if (r.rating >= 4) {
        if (r.review_text && !posThemes.includes(r.review_text)) {
          posThemes.push(r.review_text);
        }
      } else if (r.rating <= 3) {
        if (r.review_text && !impThemes.includes(r.review_text)) {
          impThemes.push(r.review_text);
        }
      }
    }

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

  // 3+ Reviews: Attempt Gemini Reasoning with Strict Evidence Grounding
  if (env.geminiApiKey) {
    try {
      const insight = await callGeminiFeedbackIntelligence(stats, reviews, language);
      if (insight) return insight;
    } catch (err: any) {
      logger.warn('[FeedbackIntelligence] Gemini API notice, falling back to deterministic review summary:', err.message);
    }
  }

  // Deterministic Fallback Engine for 3+ Reviews
  return buildDeterministicFeedbackInsight(stats, reviews, language);
}

/**
 * Call Gemini API with strict prompt instructions enforcing evidence grounding.
 */
async function callGeminiFeedbackIntelligence(
  stats: DeterministicReviewStats,
  reviews: ProductReviewRecord[],
  language: 'en' | 'ta' | 'hi'
): Promise<FeedbackInsightResult | null> {
  const reviewEvidence = reviews.map((r, i) => ({
    index: i + 1,
    rating: r.rating,
    text: r.review_text || '(Rating only, no text provided)',
  }));

  const systemPrompt = `You are the M63 Customer Feedback Intelligence Engine. Your sole task is to summarize ACTUAL customer reviews for an artisan product.

CRITICAL GROUNDING RULES:
1. Use ONLY the supplied customer reviews evidence below. Do NOT invent, assume, or hallucinate customer opinions, product complaints, or features not stated in the reviews.
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

/**
 * Deterministic fallback when Gemini API is unconfigured or unavailable.
 */
function buildDeterministicFeedbackInsight(
  stats: DeterministicReviewStats,
  reviews: ProductReviewRecord[],
  language: 'en' | 'ta' | 'hi'
): FeedbackInsightResult {
  const posThemes: string[] = [];
  const impThemes: string[] = [];

  for (const r of reviews) {
    if (r.review_text) {
      if (r.rating >= 4 && posThemes.length < 3) {
        posThemes.push(r.review_text);
      } else if (r.rating <= 3 && impThemes.length < 3) {
        impThemes.push(r.review_text);
      }
    }
  }

  const summary =
    language === 'ta'
      ? `${stats.total_reviews} சரிபார்க்கப்பட்ட வாடிக்கையாளர் மதிப்புரைகளின்படி, சராசரி மதிப்பீடு 5க்கு ${stats.average_rating} ஆகும் (${stats.positive_percentage}% நேர்மறையான அனுபவம்).`
      : language === 'hi'
      ? `${stats.total_reviews} सत्यापित ग्राहक समीक्षाओं के आधार पर, औसत रेटिंग 5 में से ${stats.average_rating} है (${stats.positive_percentage}% सकारात्मक अनुभव)।`
      : `Based on ${stats.total_reviews} verified customer reviews, the product has an average rating of ${stats.average_rating} out of 5 (${stats.positive_percentage}% positive satisfaction).`;

  return {
    summary,
    positive_themes: posThemes,
    improvement_themes: impThemes,
    evidence_count: stats.total_reviews,
    confidence: stats.total_reviews >= 5 ? 'HIGH' : 'MEDIUM',
    limitations: [`Calculated deterministically from ${stats.total_reviews} verified customer reviews.`],
  };
}
