import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AssistantIntent, AssistantLanguage, BusinessDataResult } from './assistant.types.js';

export class AssistantResponseService {
  /**
   * Classifies user intent and detects language from natural language query
   */
  classifyIntent(queryText: string): { intent: AssistantIntent; language: AssistantLanguage } {
    const text = queryText.toLowerCase();

    // Language Detection by Unicode range & keywords
    let language: AssistantLanguage = 'en';
    if (/[\u0B80-\u0BFF]/.test(queryText) || text.includes('வணக்கம்') || text.includes('பொருள்') || text.includes('விற்பனை') || text.includes('இருப்பு') || text.includes('சம்பாதிக்க') || text.includes('ஆர்டர்')) {
      language = 'ta';
    } else if (/[\u0900-\u097F]/.test(queryText) || text.includes('नमस्ते') || text.includes('बिक्री') || text.includes('उत्पाद') || text.includes('स्टॉक') || text.includes('कमाई') || text.includes('ऑर्डर')) {
      language = 'hi';
    }

    // Intent Detection Keywords
    if (text.includes('sold the most') || text.includes('top product') || text.includes('best seller') || text.includes('அதிகமாக விற்ற') || text.includes('சிறந்த') || text.includes('सबसे ज्यादा बिकने')) {
      return { intent: 'TOP_PRODUCTS', language };
    }
    if (text.includes('low in stock') || text.includes('restock') || text.includes('low stock') || text.includes('குறைவாக உள்ள') || text.includes('இருப்பு குறைவு') || text.includes('कम स्टॉक')) {
      return { intent: 'LOW_STOCK', language };
    }
    if (text.includes('inventory') || text.includes('stock quantity') || text.includes('ஸ்டாக்') || text.includes('இருப்பு') || text.includes('स्टॉक')) {
      return { intent: 'INVENTORY_SUMMARY', language };
    }
    if (text.includes('recent order') || text.includes('order status') || text.includes('orders') || text.includes('ஆர்டர்கள்') || text.includes('ஆர்டர்') || text.includes('ऑर्डर')) {
      return { intent: 'RECENT_ORDERS', language };
    }
    if (text.includes('how many product') || text.includes('total product') || text.includes('எத்தனை பொருள்') || text.includes('தயாரிப்புகள்') || text.includes('कितने उत्पाद')) {
      return { intent: 'PRODUCT_COUNT', language };
    }
    if (text.includes('pricing') || text.includes('price') || text.includes('fair price') || text.includes('விலை') || text.includes('कीमत')) {
      return { intent: 'PRICING_GUIDANCE', language };
    }
    if (text.includes('category') || text.includes('categories') || text.includes('பிரிவு')) {
      return { intent: 'CATEGORY_PERFORMANCE', language };
    }
    if (text.includes('earn') || text.includes('revenue') || text.includes('sales') || text.includes('வருவாய்') || text.includes('சம்பாத்தியம்') || text.includes('விற்பனை') || text.includes('कमाई') || text.includes('बिक्री')) {
      return { intent: 'SALES_SUMMARY', language };
    }

    return { intent: 'BUSINESS_ANALYTICS', language };
  }

  /**
   * Generates natural language response grounded strictly in verified business data
   */
  async generateResponse(
    queryText: string,
    businessData: BusinessDataResult,
    requestedLang?: AssistantLanguage
  ): Promise<{ textResponse: string; language: AssistantLanguage; suggestedQuestions: string[] }> {
    const { intent, data, evidence } = businessData;
    const classified = this.classifyIntent(queryText);

    // If query text is written in Tamil or Hindi script, prioritize detected language unless explicitly specified
    let language: AssistantLanguage = requestedLang || classified.language;
    if (classified.language !== 'en' && requestedLang === 'en') {
      language = classified.language;
    }

    // Use Gemini for Natural Multilingual Summarization if API Key is configured
    if (env.geminiApiKey) {
      try {
        const aiResponse = await this.callGeminiResponseEngine(queryText, businessData, language);
        if (aiResponse) {
          const hasTamil = /[\u0B80-\u0BFF]/.test(aiResponse);
          const hasHindi = /[\u0900-\u097F]/.test(aiResponse);

          if ((language === 'ta' && hasTamil) || (language === 'hi' && hasHindi) || language === 'en') {
            return {
              textResponse: aiResponse,
              language,
              suggestedQuestions: this.getSuggestedQuestions(intent, language),
            };
          }
        }
      } catch (err: any) {
        logger.warn('[AssistantResponseService] Gemini reasoning fallback to deterministic template:', err.message);
      }
    }

    // Deterministic Response Engine (Grounded 100% in database evidence & native script)
    const textResponse = this.buildDeterministicResponse(intent, data, evidence, language);
    return {
      textResponse,
      language,
      suggestedQuestions: this.getSuggestedQuestions(intent, language),
    };
  }

  private async callGeminiResponseEngine(
    queryText: string,
    businessData: BusinessDataResult,
    language: AssistantLanguage
  ): Promise<string | null> {
    const models = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    const langMap = { en: 'English', ta: 'Tamil', hi: 'Hindi' };
    const langName = langMap[language] || 'English';

    const systemPrompt = `You are M63 Assistant, the intelligent multilingual AI business companion for authentic Indian master artisans.
Your job is to answer the artisan's question using ONLY the provided verified business data.

CRITICAL LANGUAGE REQUIREMENT:
The user requested response in ${langName}.
You MUST write your entire response STRICTLY in ${langName} script (Tamil / Hindi / English).
DO NOT respond in English if requested language is Tamil or Hindi.

STRICT DATA GROUNDING RULES:
1. NEVER invent, hallucinate, or fabricate sales numbers, stock quantities, order totals, prices, or product names not in the evidence.
2. Formulate a friendly, concise, professional answer (2-4 sentences) in ${langName}.
3. State exact verified numbers from the evidence data.`;

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
                  { text: `Artisan Query: "${queryText}"\nTarget Language: ${langName}\nVerified M63 Business Data:\n${JSON.stringify(businessData, null, 2)}` },
                ],
              },
            ],
            generationConfig: { temperature: 0.2 },
          }),
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText && rawText.trim()) {
            return rawText.trim();
          }
        }
      } catch (e: any) {
        logger.warn(`[AssistantResponseService] Model ${model} failed:`, e.message);
      }
    }

    return null;
  }

  private buildDeterministicResponse(
    intent: AssistantIntent,
    data: Record<string, any>,
    evidence: Array<{ metric: string; value: string }>,
    language: AssistantLanguage
  ): string {
    switch (intent) {
      case 'SALES_SUMMARY':
      case 'BUSINESS_ANALYTICS': {
        const rev = data.total_revenue || 0;
        const ord = data.total_orders || 0;
        const units = data.units_sold || 0;

        if (language === 'ta') {
          return `இந்த காலத்தில் உங்களது மொத்த வருவாய் ₹${rev.toLocaleString('en-IN')}. நீங்கள் ${ord} முடிவடைந்த ஆர்டர்கள் மூலம் ${units} அலகுகளை விற்பனை செய்துள்ளீர்கள்.`;
        }
        if (language === 'hi') {
          return `इस अवधि में आपका कुल राजस्व ₹${rev.toLocaleString('en-IN')} रहा। आपने ${ord} पूरे हुए ऑर्डर के जरिए ${units} इकाइयां बेची हैं।`;
        }
        return `Your recorded revenue during this period is ₹${rev.toLocaleString('en-IN')} across ${ord} completed orders with ${units} total units sold.`;
      }

      case 'TOP_PRODUCTS': {
        const prods = data.top_products || [];
        if (prods.length === 0) {
          if (language === 'ta') return 'தற்போது விற்பனைப் பதிவுகள் எதுவும் இல்லை.';
          if (language === 'hi') return 'वर्तमान में कोई बिक्री रिकॉर्ड उपलब्ध नहीं है।';
          return 'There are currently no recorded product sales snapshots in your history.';
        }
        const top = prods[0];
        if (language === 'ta') {
          return `உங்களது சிறந்த விற்பனை தயாரிப்பு "${top.name}" ஆகும் (${top.units_sold} அலகுகள் விற்பனை, ஈட்டிய வருவாய் ₹${top.revenue.toLocaleString('en-IN')}).`;
        }
        if (language === 'hi') {
          return `आपका सबसे ज्यादा बिकने वाला उत्पाद "${top.name}" है (${top.units_sold} इकाइयां बिकीं, कुल राजस्व ₹${top.revenue.toLocaleString('en-IN')})।`;
        }
        return `Your best-selling product is "${top.name}" with ${top.units_sold} units sold generating ₹${top.revenue.toLocaleString('en-IN')} in total revenue.`;
      }

      case 'LOW_STOCK':
      case 'INVENTORY_SUMMARY': {
        const low = data.low_stock_products || [];
        const count = data.low_stock_count || 0;

        if (count === 0) {
          if (language === 'ta') return 'உங்களது அனைத்து தயாரிப்புகளும் போதிய இருப்பில் உள்ளன.';
          if (language === 'hi') return 'आपके सभी उत्पाद पर्याप्त स्टॉक में उपलब्ध हैं।';
          return 'All of your listed products currently have adequate stock levels.';
        }

        const names = low.slice(0, 3).map((p: any) => `${p.name} (${p.stock} remaining)`).join(', ');
        if (language === 'ta') {
          return `${count} தயாரிப்புகளில் இருப்பு குறைவாக உள்ளது: ${names}. நீங்கள் இவற்றை மறுஇருப்பு செய்ய பரிசீலிக்கலாம்.`;
        }
        if (language === 'hi') {
          return `${count} उत्पादों में स्टॉक कम है: ${names}। आप इन्हें फिर से स्टॉक करने पर विचार कर सकते हैं।`;
        }
        return `${count} product(s) are running low in stock: ${names}. You may want to review these items for restocking.`;
      }

      case 'RECENT_ORDERS':
      case 'ORDER_SUMMARY': {
        const count = data.total_orders || 0;
        const recent = data.recent_orders || [];

        if (count === 0) {
          if (language === 'ta') return 'உங்களுக்கு இன்னும் புதிய ஆர்டர்கள் எதுவும் வரவில்லை.';
          if (language === 'hi') return 'अभी तक आपको कोई नया ऑर्डर नहीं मिला है।';
          return 'You do not have any recent orders recorded in your history yet.';
        }

        const first = recent[0];
        if (language === 'ta') {
          return `உங்களுக்கு மொத்தம் ${count} ஆர்டர்கள் உள்ளன. சமீபத்திய ஆர்டர் #${first?.id?.substring(0, 8) || 'N/A'} (₹${first?.total_amount || 0}) நிலையில் உள்ளது.`;
        }
        if (language === 'hi') {
          return `आपके पास कुल ${count} ऑर्डर हैं। आपका हालिया ऑर्डर #${first?.id?.substring(0, 8) || 'N/A'} (₹${first?.total_amount || 0}) की स्थिति में है।`;
        }
        return `You have recorded ${count} orders. Your most recent order #${first?.id?.substring(0, 8) || 'N/A'} totals ₹${first?.total_amount || 0} with status ${first?.status || 'PENDING'}.`;
      }

      case 'PRODUCT_COUNT': {
        const total = data.total_count || 0;
        const pub = data.published_count || 0;

        if (language === 'ta') {
          return `நீங்கள் M63 இல் மொத்தம் ${total} தயாரிப்புகளை வைத்துள்ளீர்கள் (${pub} வெளியிடப்பட்டுள்ளன).`;
        }
        if (language === 'hi') {
          return `आपके पास M63 पर कुल ${total} उत्पाद सूचीबद्ध हैं (${pub} प्रकाशित हैं)।`;
        }
        return `You currently have ${total} total products registered in your workspace (${pub} published on M63 Marketplace).`;
      }

      case 'PRICING_GUIDANCE': {
        const rec = data.pricingRecord;
        if (rec) {
          if (language === 'ta') {
            return `"${data.productName}" தயாரிப்புக்கான M63 பரிந்துரைக்கப்பட்ட நியாயமான விலை வரம்பு ₹${rec.fairPriceMin} முதல் ₹${rec.fairPriceMax} ஆகும்.`;
          }
          if (language === 'hi') {
            return `"${data.productName}" के लिए M63 अनुशंसित उचित मूल्य सीमा ₹${rec.fairPriceMin} से ₹${rec.fairPriceMax} है।`;
          }
          return `For "${data.productName}", M63 Smart Fair Pricing recommends a price range between ₹${rec.fairPriceMin} and ₹${rec.fairPriceMax} with ${rec.confidenceScore}% confidence.`;
        }
        return `M63 Fair Pricing calculates production cost floors and market benchmarks to ensure artisans earn sustainable profits.`;
      }

      default: {
        if (language === 'ta') return 'M63 வணிக உதவியாளர் உங்கள் தயாரிப்புகள், விற்பனை மற்றும் ஆர்டர்களுக்கு உதவ தயாராக உள்ளது.';
        if (language === 'hi') return 'M63 व्यवसाय सहायक आपके उत्पादों, बिक्री और ऑर्डरों में मदद के लिए तैयार है।';
        return 'M63 Assistant is ready to help you manage your artisan products, sales analytics, and customer orders.';
      }
    }
  }

  private getSuggestedQuestions(intent: AssistantIntent, language: AssistantLanguage): string[] {
    if (language === 'ta') {
      return [
        'இந்த மாதம் எனது விற்பனை எவ்வாறு உள்ளது?',
        'எந்த பொருள் அதிகமாக விற்றுள்ளது?',
        'இருப்பு குறைவாக உள்ள பொருட்கள் எவை?',
        'எனது சமீபத்திய ஆர்டர்களைக் காட்டு',
      ];
    }
    if (language === 'hi') {
      return [
        'इस महीने मेरी बिक्री कैसी है?',
        'सबसे ज्यादा बिकने वाला उत्पाद कौन सा है?',
        'कम स्टॉक वाले उत्पाद कौन से हैं?',
        'मेरे हालिया ऑर्डर दिखाएं',
      ];
    }
    return [
      'How are my sales this month?',
      'Which product sold the most?',
      'Which products are low in stock?',
      'Show my recent orders',
    ];
  }
}

export const assistantResponseService = new AssistantResponseService();
