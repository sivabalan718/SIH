import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { CalculatedAnalytics } from '../analytics.service.js';

export interface BusinessInsight {
  id: string;
  type: 'SALES' | 'PRODUCT' | 'INVENTORY' | 'CATEGORY' | 'TREND' | 'OPERATIONAL' | 'OPPORTUNITY' | 'WARNING';
  title: string;
  message: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  trust_level: 'VERIFIED' | 'OBSERVED' | 'INFERRED' | 'UNAVAILABLE';
  evidence: Array<{ metric: string; value: string }>;
  recommendation?: string;
  limitations?: string[];
}

export async function generateBusinessInsights(
  analytics: CalculatedAnalytics,
  language: 'en' | 'ta' | 'hi' = 'en'
): Promise<BusinessInsight[]> {
  if (!analytics.has_data || (analytics.kpis.total_orders === 0 && analytics.kpis.active_products === 0)) {
    return [
      {
        id: 'empty-state-insight',
        type: 'OPPORTUNITY',
        title: language === 'ta' ? 'வணிக பகுப்பாய்வு தயார்நிலையில் உள்ளது' : language === 'hi' ? 'व्यापार विश्लेषण तैयार है' : 'Business Intelligence Ready',
        message:
          language === 'ta'
            ? 'வாடிக்கையாளர்கள் உங்கள் தயாரிப்புகளை வாங்கத் தொடங்கியதும், விற்பனைப் போக்குகள் மற்றும் பரிந்துரைகள் இங்கு தோன்றும்.'
            : language === 'hi'
            ? 'जब ग्राहक आपके उत्पादों को खरीदना शुरू करेंगे, तब बिक्री रुझान और सिफारिशें यहां दिखाई देंगी।'
            : 'Once customers start purchasing your products, M63 will show sales trends, product performance, and actionable recommendations here.',
        confidence: 'HIGH',
        trust_level: 'VERIFIED',
        evidence: [{ metric: 'Total Orders', value: '0' }],
        recommendation: 'Register and publish your authentic products to start receiving buyer orders in M63 Marketplace.',
        limitations: ['Analytics workspace will automatically update upon order placement.'],
      },
    ];
  }

  // Attempt Gemini AI Reasoning with Strict JSON Output
  if (env.geminiApiKey) {
    try {
      const insights = await callGeminiBusinessIntelligence(analytics, language);
      if (insights && insights.length > 0) {
        return insights;
      }
    } catch (err: any) {
      logger.warn('[BusinessIntelligenceService] Gemini call notice, using deterministic insights fallback:', err.message);
    }
  }

  // Deterministic Fallback Engine (Runs when Gemini API is unavailable/quota limited)
  return buildDeterministicInsights(analytics, language);
}

async function callGeminiBusinessIntelligence(
  analytics: CalculatedAnalytics,
  language: 'en' | 'ta' | 'hi'
): Promise<BusinessInsight[]> {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  const languageNames: Record<string, string> = { en: 'English', ta: 'Tamil', hi: 'Hindi' };
  const targetLang = languageNames[language] || 'English';

  const payloadSummary = {
    period: analytics.period,
    revenue: analytics.kpis.total_revenue,
    orders: analytics.kpis.total_orders,
    units_sold: analytics.kpis.units_sold,
    average_order_value: analytics.kpis.average_order_value,
    active_products: analytics.kpis.active_products,
    available_stock: analytics.kpis.available_stock,
    revenue_growth_percent: analytics.comparison.revenue_change_percent,
    orders_growth_percent: analytics.comparison.orders_change_percent,
    top_products: analytics.product_performance.slice(0, 3).map((p) => ({
      name: p.name,
      category: p.category,
      units_sold: p.units_sold,
      revenue: p.revenue,
      stock: p.stock_quantity,
      velocity: p.sales_velocity_per_day,
    })),
    top_categories: analytics.category_performance.slice(0, 3).map((c) => ({
      category: c.category,
      revenue: c.revenue,
      share: c.revenue_share_percent,
    })),
    inventory_health: {
      low_stock_count: analytics.inventory_health.low_stock_count,
      out_of_stock_count: analytics.inventory_health.out_of_stock_count,
      bestseller_low_stock: analytics.inventory_health.bestseller_low_stock_count,
    },
    fulfilment: {
      delivered: analytics.fulfilment.delivered,
      pending: analytics.fulfilment.pending,
      cancelled: analytics.fulfilment.cancelled,
      cancellation_rate: analytics.fulfilment.cancellation_rate_percent,
    },
  };

  const systemPrompt = `You are the M63 Smart Business Intelligence Reasoning Engine for Indian master artisans.
Your job is to analyze verified artisan commerce metrics and return 3 to 5 clear, evidence-based business insights in JSON format.

CRITICAL RULES:
1. NEVER invent or fabricate numbers, revenue, orders, stock, customer numbers, or market statistics not present in the payload.
2. ALWAYS attach clear evidence metrics for every insight.
3. Every insight must contain a clear "Why is M63 saying this?" evidence breakdown.
4. Output language must be ${targetLang}.
5. Return ONLY a valid JSON array of objects matching this exact schema:

[
  {
    "id": "unique-id-1",
    "type": "SALES" | "PRODUCT" | "INVENTORY" | "CATEGORY" | "TREND" | "OPERATIONAL" | "OPPORTUNITY" | "WARNING",
    "title": "Short title in ${targetLang}",
    "message": "1-2 sentence evidence-based business observation in ${targetLang}",
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "trust_level": "VERIFIED" | "OBSERVED" | "INFERRED" | "UNAVAILABLE",
    "evidence": [
      { "metric": "Metric name", "value": "Exact value string" }
    ],
    "recommendation": "Actionable decision recommendation for artisan in ${targetLang}",
    "limitations": ["Limitation note based strictly on available data"]
  }
]`;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: `Verified Artisan Analytics Data:\n${JSON.stringify(payloadSummary, null, 2)}` },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      });

      if (response.ok) {
        const resJson: any = await response.json();
        const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e: any) {
      logger.warn(`[BusinessIntelligenceService] Model ${model} failed:`, e.message);
    }
  }

  return [];
}

export function buildDeterministicInsights(
  analytics: CalculatedAnalytics,
  language: 'en' | 'ta' | 'hi' = 'en'
): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  // Insight 1: Top Category / Sales Insight
  if (analytics.category_performance.length > 0) {
    const topCat = analytics.category_performance[0];
    if (topCat.revenue > 0) {
      insights.push({
        id: 'det-top-category',
        type: 'CATEGORY',
        title:
          language === 'ta'
            ? `${topCat.category} அதிக வருவாய் தரும் பிரிவு`
            : language === 'hi'
            ? `${topCat.category} सबसे अधिक राजस्व श्रेणी है`
            : `${topCat.category} Generated Highest Revenue`,
        message:
          language === 'ta'
            ? `${topCat.category} பிரிவு ₹${topCat.revenue.toLocaleString('en-IN')} வருவாயை உருவாக்கியுள்ளது, இது மொத்த விற்பனையில் ${topCat.revenue_share_percent}% ஆகும்.`
            : language === 'hi'
            ? `${topCat.category} श्रेणी ने ₹${topCat.revenue.toLocaleString('en-IN')} का राजस्व उत्पन्न किया, जो कुल बिक्री का ${topCat.revenue_share_percent}% है।`
            : `${topCat.category} products generated ₹${topCat.revenue.toLocaleString('en-IN')}, accounting for ${topCat.revenue_share_percent}% of your recorded revenue during this period.`,
        confidence: 'HIGH',
        trust_level: 'VERIFIED',
        evidence: [
          { metric: 'Category Revenue', value: `₹${topCat.revenue.toLocaleString('en-IN')}` },
          { metric: 'Revenue Share', value: `${topCat.revenue_share_percent}%` },
          { metric: 'Units Sold', value: `${topCat.units_sold} units` },
        ],
        recommendation: `Ensure adequate raw materials and stock levels for your top-performing ${topCat.category} creations.`,
        limitations: ['Based exclusively on recorded M63 order history.'],
      });
    }
  }

  // Insight 2: Top Selling Product
  if (analytics.product_performance.length > 0) {
    const topProd = analytics.product_performance[0];
    if (topProd.units_sold > 0) {
      insights.push({
        id: 'det-top-product',
        type: 'PRODUCT',
        title:
          language === 'ta'
            ? `${topProd.name} சிறந்த விற்பனை தயாரிப்பு`
            : language === 'hi'
            ? `${topProd.name} आपका सबसे अधिक बिकने वाला उत्पाद है`
            : `${topProd.name} is Your Top Performing Product`,
        message:
          language === 'ta'
            ? `${topProd.name} ${topProd.units_sold} அலகுகள் விற்பனையாகி ₹${topProd.revenue.toLocaleString('en-IN')} ஈட்டியுள்ளது.`
            : language === 'hi'
            ? `${topProd.name} के ${topProd.units_sold} इकाइयां बिकीं और ₹${topProd.revenue.toLocaleString('en-IN')} का राजस्व मिला।`
            : `${topProd.name} recorded ${topProd.units_sold} units sold across ${topProd.order_count} orders generating ₹${topProd.revenue.toLocaleString('en-IN')}.`,
        confidence: 'HIGH',
        trust_level: 'VERIFIED',
        evidence: [
          { metric: 'Units Sold', value: `${topProd.units_sold}` },
          { metric: 'Revenue', value: `₹${topProd.revenue.toLocaleString('en-IN')}` },
          { metric: 'Remaining Stock', value: `${topProd.stock_quantity} units` },
        ],
        recommendation: 'Maintain product availability to capture ongoing buyer demand.',
        limitations: ['Calculated from current order snapshots.'],
      });
    }
  }

  // Insight 3: Inventory Health / Bestseller Low Stock Warning
  if (analytics.inventory_health.bestseller_low_stock_count > 0 || analytics.inventory_health.low_stock_count > 0) {
    const lowProd = analytics.inventory_health.low_stock_products[0];
    if (lowProd) {
      insights.push({
        id: 'det-low-stock-warning',
        type: 'INVENTORY',
        title:
          language === 'ta'
            ? `இருப்பு எச்சரிக்கை: ${lowProd.name}`
            : language === 'hi'
            ? `स्टॉक चेतावनी: ${lowProd.name}`
            : `Inventory Restock Attention Needed: ${lowProd.name}`,
        message:
          language === 'ta'
            ? `${lowProd.name} விற்பனையில் சிறப்பாக உள்ளது, ஆனால் ${lowProd.stock_quantity} அலகுகள் மட்டுமே இருப்பில் உள்ளன.`
            : language === 'hi'
            ? `${lowProd.name} अच्छी बिक्री दर्ज कर रहा है, लेकिन केवल ${lowProd.stock_quantity} इकाइयां शेष हैं।`
            : `${lowProd.name} is performing strongly but has only ${lowProd.stock_quantity} units remaining in stock.`,
        confidence: 'HIGH',
        trust_level: 'VERIFIED',
        evidence: [
          { metric: 'Current Stock', value: `${lowProd.stock_quantity} units` },
          { metric: 'Units Sold', value: `${lowProd.units_sold} units` },
          { metric: 'Sales Velocity', value: `${lowProd.sales_velocity_per_day} units/day` },
        ],
        recommendation: 'Consider replenishing inventory to avoid stockouts on high-demand products.',
        limitations: ['Estimated stock depletion rate is based on recent order history.'],
      });
    }
  }

  // Insight 4: General Business Overview
  if (insights.length === 0) {
    insights.push({
      id: 'det-overview',
      type: 'SALES',
      title: 'M63 Artisan Commerce Overview',
      message: `You have ${analytics.kpis.active_products} products listed and ${analytics.kpis.total_orders} completed orders totaling ₹${analytics.kpis.total_revenue.toLocaleString('en-IN')}.`,
      confidence: 'HIGH',
      trust_level: 'VERIFIED',
      evidence: [
        { metric: 'Active Products', value: `${analytics.kpis.active_products}` },
        { metric: 'Total Revenue', value: `₹${analytics.kpis.total_revenue.toLocaleString('en-IN')}` },
        { metric: 'Total Orders', value: `${analytics.kpis.total_orders}` },
      ],
      recommendation: 'Continue managing your product inventory and customer orders in M63 Artisan Workspace.',
      limitations: ['Insights update automatically as new orders are placed.'],
    });
  }

  return insights;
}
