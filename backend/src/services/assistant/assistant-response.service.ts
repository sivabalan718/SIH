import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AssistantIntent, AssistantLanguage, BusinessDataResult, WebSourceItem } from './assistant.types.js';

export class AssistantResponseService {
  /**
   * Classifies user intent into one of 4 categories:
   * 1. M63_BUSINESS (Supabase DB Grounded)
   * 2. GENERAL_CONVERSATION (Friendly Conversational AI)
   * 3. WEB_RESEARCH (Gemini Google Search Grounding)
   * 4. MIXED_COMPARISON (M63 Verified Data + External Web Research)
   */
  classifyIntent(queryText: string): { intent: AssistantIntent; language: AssistantLanguage } {
    const text = queryText.toLowerCase().trim();

    // Language Detection by Unicode range & keywords
    let language: AssistantLanguage = 'en';
    if (
      /[\u0B80-\u0BFF]/.test(queryText) ||
      text.includes('வணக்கம்') ||
      text.includes('பொருள்') ||
      text.includes('விற்பனை') ||
      text.includes('இருப்பு') ||
      text.includes('சம்பாதிக்க') ||
      text.includes('ஆர்டர்') ||
      text.includes('தேடு')
    ) {
      language = 'ta';
    } else if (
      /[\u0900-\u097F]/.test(queryText) ||
      text.includes('नमस्ते') ||
      text.includes('बिक्री') ||
      text.includes('उत्पाद') ||
      text.includes('स्टॉक') ||
      text.includes('कमाई') ||
      text.includes('ऑर्डर') ||
      text.includes('खोजो')
    ) {
      language = 'hi';
    }

    // Category 4: Mixed Comparison Mode Keywords
    if (
      text.includes('compare') ||
      text.includes('is my price reasonable') ||
      text.includes('compared with online') ||
      text.includes('ஒப்பீடு') ||
      text.includes('ஒப்பிடு') ||
      text.includes('ஆன்லைன் விலையுடன்') ||
      text.includes('விலை ஒப்பீடு') ||
      text.includes('तुलना')
    ) {
      return { intent: 'MIXED_COMPARISON', language };
    }

    // Category 3: Web Research Mode Keywords
    if (
      text.includes('online') ||
      text.includes('search web') ||
      text.includes('find online') ||
      text.includes('available online') ||
      text.includes('websites selling') ||
      text.includes('other websites') ||
      text.includes('market prices') ||
      text.includes('latest trends') ||
      text.includes('ஆன்லைன்') ||
      text.includes('ஆன்லைனில்') ||
      text.includes('இணையதளங்கள்') ||
      text.includes('இணையத்தில்') ||
      text.includes('தேடு') ||
      text.includes('ऑनलाइन') ||
      text.includes('खोजो') ||
      text.includes('वेबसाइट')
    ) {
      return { intent: 'WEB_RESEARCH', language };
    }

    // Category 1: M63 Business Mode Keywords
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
    if (text.includes('pricing') || text.includes('fair price') || text.includes('suggested price') || text.includes('நியாயமான விலை') || text.includes('उचित मूल्य')) {
      return { intent: 'PRICING_GUIDANCE', language };
    }
    if (text.includes('category') || text.includes('categories') || text.includes('பிரிவு')) {
      return { intent: 'CATEGORY_PERFORMANCE', language };
    }
    if (text.includes('earn') || text.includes('revenue') || text.includes('my sales') || text.includes('வருவாய்') || text.includes('சம்பாத்தியம்') || text.includes('விற்பனை') || text.includes('कमाई') || text.includes('बिक्री')) {
      return { intent: 'SALES_SUMMARY', language };
    }

    // Category 2: General Conversation Keywords
    if (
      text.includes('hello') ||
      text.includes('hi ') ||
      text === 'hi' ||
      text.includes('how are you') ||
      text.includes('tell me a joke') ||
      text.includes('joke') ||
      text.includes('feeling') ||
      text.includes('tired') ||
      text.includes('stressed') ||
      text.includes('explain ai') ||
      text.includes('machine learning') ||
      text.includes('who is') ||
      text.includes('what is') ||
      text.includes('motivation') ||
      text.includes('let\'s talk') ||
      text.includes('python') ||
      text.includes('java') ||
      text.includes('வணக்கம்') ||
      text.includes('நலமா') ||
      text.includes('ஜோக்') ||
      text.includes('नमस्ते') ||
      text.includes('कैसे हो') ||
      text.includes('चुटकुला')
    ) {
      return { intent: 'GENERAL_CONVERSATION', language };
    }

    // Default fallback to GENERAL_CONVERSATION
    return { intent: 'GENERAL_CONVERSATION', language };
  }

  /**
   * Main response generation entry point across all 4 intelligence modes
   */
  async generateResponse(
    queryText: string,
    businessData: BusinessDataResult,
    requestedLang?: AssistantLanguage
  ): Promise<{ textResponse: string; language: AssistantLanguage; suggestedQuestions: string[]; sources?: WebSourceItem[] }> {
    const intent = businessData.intent || this.classifyIntent(queryText).intent;
    const classified = this.classifyIntent(queryText);

    let language: AssistantLanguage = requestedLang || classified.language;
    if (classified.language !== 'en' && requestedLang === 'en') {
      language = classified.language;
    }

    // Route Mode 3 & Mode 4 to Google Search Grounding Engine
    if (intent === 'WEB_RESEARCH' || intent === 'MIXED_COMPARISON') {
      return this.handleWebResearchMode(queryText, businessData, intent, language);
    }

    // Route Mode 2 to General Conversation Engine
    if (intent === 'GENERAL_CONVERSATION') {
      return this.handleGeneralConversationMode(queryText, language);
    }

    // Route Mode 1 to M63 Business Engine (Supabase Grounded)
    return this.handleBusinessDataMode(queryText, businessData, language);
  }

  /**
   * Mode 1: M63 Business Response Generator (Strict Database Grounding)
   */
  private async handleBusinessDataMode(
    queryText: string,
    businessData: BusinessDataResult,
    language: AssistantLanguage
  ): Promise<{ textResponse: string; language: AssistantLanguage; suggestedQuestions: string[] }> {
    const { intent, data, evidence } = businessData;

    if (env.geminiApiKey) {
      try {
        const aiResponse = await this.callGeminiBusinessEngine(queryText, businessData, language);
        if (aiResponse) {
          return {
            textResponse: aiResponse,
            language,
            suggestedQuestions: this.getSuggestedQuestions(intent, language),
          };
        }
      } catch (err: any) {
        logger.warn('[AssistantResponseService] Gemini business reasoning fallback to deterministic template:', err.message);
      }
    }

    const textResponse = this.buildDeterministicResponse(intent, data, evidence, language);
    return {
      textResponse,
      language,
      suggestedQuestions: this.getSuggestedQuestions(intent, language),
    };
  }

  /**
   * Mode 2: General Conversation Engine (Friendly Conversational AI)
   */
  private async handleGeneralConversationMode(
    queryText: string,
    language: AssistantLanguage
  ): Promise<{ textResponse: string; language: AssistantLanguage; suggestedQuestions: string[] }> {
    const langMap = { en: 'English', ta: 'Tamil', hi: 'Hindi' };
    const langName = langMap[language] || 'English';

    if (env.geminiApiKey) {
      try {
        const prompt = `You are M63 Assistant, a friendly, intelligent, and warm AI companion for Indian master artisans.
The user is engaging in general conversation.
Respond naturally, helpfully, and conversationally. You can be friendly, informative, casual, or humorous as appropriate.
DO NOT force the conversation back into M63 business topics unless relevant.

CRITICAL LANGUAGE MANDATE:
The response MUST be written strictly in ${langName} script (Tamil / Hindi / English).
User query: "${queryText}"`;

        const responseText = await this.callGeminiSimple(prompt);
        if (responseText) {
          return {
            textResponse: responseText,
            language,
            suggestedQuestions: this.getSuggestedQuestions('GENERAL_CONVERSATION', language),
          };
        }
      } catch (err: any) {
        logger.warn('[AssistantResponseService] General conversation LLM call failed:', err.message);
      }
    }

    const fallbackMap: Record<AssistantLanguage, string> = {
      en: "Namaste! I am your M63 Assistant. I'm here to converse with you, answer general questions, or assist with your artisan business. How can I help you today?",
      ta: "வணக்கம்! நான் உங்கள் M63 உதவியாளர். உங்களுடன் உரையாடவும், பொதுவான கேள்விகளுக்குப் பதிலளிக்கவும், உங்கள் கைவினை வணிகத்திற்கு உதவவும் நான் தயாராக உள்ளேன்.",
      hi: "नमस्ते! मैं आपका M63 सहायक हूँ। मैं आपसे बात करने, सामान्य प्रश्नों के उत्तर देने और आपके व्यापार में मदद करने के लिए यहाँ हूँ।",
    };

    return {
      textResponse: fallbackMap[language] || fallbackMap.en,
      language,
      suggestedQuestions: this.getSuggestedQuestions('GENERAL_CONVERSATION', language),
    };
  }

  /**
   * Mode 3 & Mode 4: Web Research Engine via Gemini Google Search Grounding
   */
  private async handleWebResearchMode(
    queryText: string,
    businessData: BusinessDataResult,
    intent: AssistantIntent,
    language: AssistantLanguage
  ): Promise<{ textResponse: string; language: AssistantLanguage; suggestedQuestions: string[]; sources?: WebSourceItem[] }> {
    if (!env.geminiApiKey) {
      return this.returnWebFailureMessage(intent, language);
    }

    try {
      const searchResult = await this.callGeminiWithGoogleSearch(queryText, businessData, intent, language);

      if (!searchResult || !searchResult.textResponse || searchResult.textResponse.trim().length === 0) {
        return this.returnWebFailureMessage(intent, language);
      }

      return {
        textResponse: searchResult.textResponse,
        language,
        suggestedQuestions: this.getSuggestedQuestions(intent, language),
        sources: searchResult.sources,
      };
    } catch (err: any) {
      logger.error('[AssistantResponseService] Google Search Grounding error:', err.message);
      return this.returnWebFailureMessage(intent, language);
    }
  }

  /**
   * Strict Web Search Failure Response Generator
   */
  private returnWebFailureMessage(
    intent: AssistantIntent,
    language: AssistantLanguage
  ): { textResponse: string; language: AssistantLanguage; suggestedQuestions: string[]; sources: WebSourceItem[] } {
    const failureTextMap: Record<AssistantLanguage, string> = {
      en: 'Web research is temporarily unavailable. Please try again in a few moments.',
      ta: 'தற்போது இணைய தேடல் கிடைக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
      hi: 'अभी वेब खोज उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।',
    };

    return {
      textResponse: failureTextMap[language] || failureTextMap.en,
      language,
      suggestedQuestions: this.getSuggestedQuestions(intent, language),
      sources: [],
    };
  }

  /**
   * Executes Gemini API with Google Search Grounding (`tools: [{ googleSearch: {} }]`)
   * Extracts text response and parses groundingMetadata for source citations.
   */
  private async callGeminiWithGoogleSearch(
    queryText: string,
    businessData: BusinessDataResult,
    intent: AssistantIntent,
    language: AssistantLanguage
  ): Promise<{ textResponse: string; sources: WebSourceItem[] } | null> {
    const langMap = { en: 'English', ta: 'Tamil', hi: 'Hindi' };
    const langName = langMap[language] || 'English';
    const isMixed = intent === 'MIXED_COMPARISON';

    let systemPrompt = `You are M63 Assistant performing web research for an authentic Indian artisan.
Your task is to search the external web using Google Search grounding and summarize current information in ${langName}.

CRITICAL REQUIREMENTS:
1. Provide a concise, clear summary of external market findings in ${langName} script.
2. Use terminology such as "External Web Data", "Observed Online Prices", "External Market Products", or "Online Listings".
3. NEVER claim external products belong to M63 or are sold by the artisan.
4. NEVER invent or hallucinate market numbers not returned by the search engine.`;

    if (isMixed) {
      systemPrompt += `\n\nMIXED COMPARISON MANDATE:
The user is comparing their verified M63 product against external market listings.
Verified M63 Product Context:
${JSON.stringify(businessData.data, null, 2)}

In your response in ${langName}, clearly separate and label:
- M63 Verified Data (Artisan's product & price)
- External Web Data (Observed online market products & prices)`;
    }

    const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;

        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: `Artisan Web Query: "${queryText}"\nTarget Language: ${langName}` },
              ],
            },
          ],
          tools: [
            {
              googleSearch: {},
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const candidate = resJson?.candidates?.[0];
          const rawText = candidate?.content?.parts?.[0]?.text;

          if (rawText && rawText.trim()) {
            const sources = this.extractSourcesFromGrounding(candidate?.groundingMetadata);
            logger.info(`[AssistantResponseService] Google Search Grounding succeeded via model ${model} (${sources.length} sources)`);
            return {
              textResponse: rawText.trim(),
              sources,
            };
          }
        } else {
          const errorText = await response.text().catch(() => '');
          logger.warn(`[AssistantResponseService] Search Grounding model ${model} HTTP ${response.status}: ${errorText.substring(0, 150)}`);
        }
      } catch (err: any) {
        logger.warn(`[AssistantResponseService] Search Grounding model ${model} failed:`, err.message);
      }
    }

    return null;
  }

  /**
   * Normalizes raw Gemini groundingMetadata into clean, deduplicated application WebSourceItem[]
   */
  private extractSourcesFromGrounding(groundingMetadata: any): WebSourceItem[] {
    if (!groundingMetadata) return [];

    const sources: WebSourceItem[] = [];
    const seenUrls = new Set<string>();

    const chunks = groundingMetadata.groundingChunks || groundingMetadata.grounding_chunks || [];

    for (const chunk of chunks) {
      const uri = chunk?.web?.uri || chunk?.uri;
      if (uri && !seenUrls.has(uri)) {
        seenUrls.add(uri);

        let title = chunk?.web?.title || chunk?.title;
        if (!title || !title.trim()) {
          try {
            const urlObj = new URL(uri);
            title = urlObj.hostname.replace(/^www\./, '');
          } catch (e) {
            title = 'Web Source';
          }
        }

        sources.push({
          title: title.trim(),
          url: uri.trim(),
        });
      }
    }

    return sources.slice(0, 5);
  }

  private async callGeminiSimple(promptText: string): Promise<string | null> {
    const models = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.7 },
          }),
        });
        if (response.ok) {
          const json: any = await response.json();
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) return text.trim();
        }
      } catch (e) {}
    }
    return null;
  }

  private async callGeminiBusinessEngine(
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
      if (intent === 'GENERAL_CONVERSATION') {
        return ['ஒரு ஜோக் சொல்லு', 'செயற்கை நுண்ணறிவு பற்றி விளக்கு', 'எனது விற்பனை எவ்வாறு உள்ளது?', 'ஆன்லைனில் களிமண் பொருட்கள் தேடு'];
      }
      if (intent === 'WEB_RESEARCH' || intent === 'MIXED_COMPARISON') {
        return ['ஆன்லைனில் கைவினைப் பொருட்கள் தேடு', 'எனது பொருளின் விலையை ஆன்லைனுடன் ஒப்பிடு', 'இந்த மாதம் எனது விற்பனை எவ்வாறு உள்ளது?'];
      }
      return [
        'இந்த மாதம் எனது விற்பனை எவ்வாறு உள்ளது?',
        'எந்த பொருள் அதிகமாக விற்றுள்ளது?',
        'இருப்பு குறைவாக உள்ள பொருட்கள் எவை?',
        'ஆன்லைனில் கைவினைப் பொருட்கள் தேடு',
      ];
    }
    if (language === 'hi') {
      if (intent === 'GENERAL_CONVERSATION') {
        return ['एक मज़ेदार चुटकुला सुनाओ', 'AI को आसान भाषा में समझाओ', 'इस महीने मेरी बिक्री कैसी है?', 'ऑनलाइन हस्तनिर्मित उत्पाद खोजो'];
      }
      if (intent === 'WEB_RESEARCH' || intent === 'MIXED_COMPARISON') {
        return ['ऑनलाइन मिट्टी के बर्तन खोजो', 'मेरी कीमत की तुलना ऑनलाइन से करो', 'इस महीने मेरी बिक्री कैसी है?'];
      }
      return [
        'इस महीने मेरी बिक्री कैसी है?',
        'सबसे ज्यादा बिकने वाला उत्पाद कौन सा है?',
        'कम स्टॉक वाले उत्पाद कौन से हैं?',
        'ऑनलाइन हस्तनिर्मित उत्पाद खोजो',
      ];
    }

    if (intent === 'GENERAL_CONVERSATION') {
      return ['Tell me a joke', 'Explain AI simply', 'How are my sales this month?', 'Find terracotta products online'];
    }
    if (intent === 'WEB_RESEARCH' || intent === 'MIXED_COMPARISON') {
      return ['Find terracotta products online', 'Compare my product price with online', 'How are my sales this month?'];
    }

    return [
      'How are my sales this month?',
      'Which product sold the most?',
      'Which products are low in stock?',
      'Find terracotta products online',
    ];
  }
}

export const assistantResponseService = new AssistantResponseService();
