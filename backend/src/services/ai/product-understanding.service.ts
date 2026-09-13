import { ProductUnderstandingProvider, ExtractedProductData } from './ai.types.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const M63_PRODUCT_UNDERSTANDING_SYSTEM_PROMPT = `
You are M63 Product Understanding AI, an assistant specialized in extracting structured product information from natural regional-language speech (Tamil, Hindi, English, etc.) of traditional Indian artisans.

CRITICAL MULTILINGUAL & NORMALIZATION RULE:
- Regardless of whether the spoken audio transcript is in Tamil, Hindi, or English, you MUST ALWAYS output all extracted product values in standard, clean ENGLISH.
- DO NOT return Tamil or Hindi characters inside the extracted product values.

STRICT ZERO-HALLUCINATION & CLARIFICATION RULES:
1. You MUST extract ONLY facts explicitly stated in the transcript.
2. You MUST NOT invent, guess, or hallucinate:
   - Price or monetary values (Price MUST ONLY be extracted if explicitly and unambiguously stated, e.g. "Two thousand rupees" -> 2000. If ambiguous like "around two thousand", set needs_clarification = true and price = null)
   - Materials, craft techniques, or production times not mentioned.
3. If information is missing or ambiguous, set needs_clarification = true and provide a clear explanation.
4. Return ONLY a valid JSON object matching this exact schema:

{
  "product_name": string | null,
  "description": string | null,
  "category": string | null,
  "subcategory": string | null,
  "material": string | null,
  "color": string | null,
  "craft_type": string | null,
  "features": string[],
  "production_time": string | null,
  "price": number | null,
  "stock_quantity": number | null,
  "keywords": string[],
  "uncertain_fields": string[],
  "missing_fields": string[],
  "needs_clarification": boolean,
  "clarification_message": string | null
}
`;

/**
 * Mock LLM Provider for test suite and offline dev
 */
export class MockLLMProvider implements ProductUnderstandingProvider {
  name = 'MockLLMProvider';

  async extractProductData(
    transcript: string,
    detectedLanguage: string,
    targetField?: string,
    questionLanguage?: string
  ): Promise<ExtractedProductData> {
    logger.info(`[MockLLMProvider] Extracting data (field: ${targetField || 'all'}, lang: ${questionLanguage || 'en'})`);

    const lower = transcript.toLowerCase();

    // Check for ambiguous price or stock phrases
    const isAmbiguousPrice = lower.includes('around') || lower.includes('about') || lower.includes('maybe');
    const isCotton = lower.includes('cotton') || lower.includes('பருத்தி') || lower.includes('सूती');
    const isSaree = lower.includes('saree') || lower.includes('சேலை') || lower.includes('साड़ी');
    const isRed = lower.includes('red') || lower.includes('சிகப்பு') || lower.includes('लाल');
    const isGold = lower.includes('gold') || lower.includes('தங்கம்') || lower.includes('सुनहरा');
    const isHandwoven = lower.includes('woven') || lower.includes('weaving') || lower.includes('handmade') || lower.includes('hand woven') || lower.includes('by hand') || lower.includes('கைத்தறி') || lower.includes('हथकरघा');
    const isFourDays = lower.includes('four days') || lower.includes('4 days');

    let priceValue: number | null = null;
    let stockValue: number | null = null;
    let needsClarification = false;
    let clarificationMsg: string | null = null;

    if (lower.includes('2000') || lower.includes('two thousand') || lower.includes('இரண்டாயிரம்')) {
      if (isAmbiguousPrice) {
        needsClarification = true;
        clarificationMsg = 'Price phrase appears approximate. Please confirm exact numeric selling price.';
      } else {
        priceValue = 2000;
      }
    }

    if (lower.includes('25') || lower.includes('twenty five') || lower.includes('இருபத்தி ஐந்து')) {
      stockValue = 25;
    }

    return {
      product_name: isSaree ? (isCotton ? 'Handmade Cotton Saree' : 'Handcrafted Saree') : transcript.trim(),
      description: transcript.trim(),
      category: isSaree || isCotton ? 'Handloom' : 'Handicraft',
      subcategory: isSaree ? 'Saree' : null,
      material: isCotton ? 'Cotton' : null,
      color: isRed && isGold ? 'Red and Gold' : isRed ? 'Red' : null,
      craft_type: isHandwoven ? 'Handwoven' : null,
      features: [
        ...(isHandwoven ? ['Handwoven'] : []),
        ...(isGold ? ['Gold border'] : []),
      ],
      production_time: isFourDays ? '4 days' : null,
      price: priceValue,
      stock_quantity: stockValue,
      keywords: [
        ...(isCotton ? ['cotton'] : []),
        ...(isSaree ? ['saree'] : []),
        ...(isHandwoven ? ['handwoven'] : []),
      ],
      uncertain_fields: needsClarification ? ['price'] : [],
      missing_fields: priceValue === null ? ['price'] : [],
      needs_clarification: needsClarification,
      clarification_message: clarificationMsg,
      target_field: targetField || null,
    };
  }
}

/**
 * Gemini LLM Provider using Google Gemini API
 */
export class GeminiLLMProvider implements ProductUnderstandingProvider {
  name = 'GeminiLLMProvider';

  async extractProductData(
    transcript: string,
    detectedLanguage: string,
    targetField?: string,
    questionLanguage?: string
  ): Promise<ExtractedProductData> {
    logger.info(`[GeminiLLMProvider] Extracting data for transcript (field: ${targetField || 'all'}, lang: ${questionLanguage || 'en'}, spoken: ${detectedLanguage})`);

    if (!env.geminiApiKey) {
      logger.warn('[GeminiLLMProvider] GEMINI_API_KEY missing.');
      throw Object.assign(
        new Error('M63 AI assistance is currently unavailable. Please try again later.'),
        { code: 'AI_UNCONFIGURED', statusCode: 503 }
      );
    }

    // Candidate models to attempt in sequence (stable flash models handle LLM extraction best)
    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      env.geminiLlmModel || 'gemini-3.7-flash',
    ];

    let fieldInstruction = `Extract structured product details across all fields.`;
    if (targetField && targetField !== 'all') {
      fieldInstruction = `The artisan is answering specifically for field "${targetField}". You MUST populate the field "${targetField === 'name' ? 'product_name' : targetField}" with a clean, accurate ENGLISH translation/summary of what was spoken.`;
    }

    const userPrompt = `
Artisan Spoken Transcript (${detectedLanguage}):
"${transcript}"

Question Language Presented to Artisan: ${questionLanguage || 'en'}
Target Form Field: ${targetField || 'all'}

${fieldInstruction}

Translate/normalize ALL output fields into ENGLISH.
If price or stock quantity was spoken approximately (e.g. "around 2000" or "about 10"), set price/stock_quantity to null, set needs_clarification to true, and provide a clarification_message in English.

Return ONLY the JSON object.
`;

    let lastError = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${M63_PRODUCT_UNDERSTANDING_SYSTEM_PROMPT}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
            },
          }),
        });

        const json: any = await response.json();

        if (!response.ok) {
          lastError = json?.error?.message || `Model ${model} returned ${response.status}`;
          logger.warn(`[GeminiLLMProvider] Model ${model} error: ${lastError}`);
          continue;
        }

        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastError = `Empty response from model ${model}`;
          continue;
        }

        const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJsonText);

        logger.info(`[GeminiLLMProvider] Extraction succeeded with model [${model}]`);
        return parsedData;
      } catch (err: any) {
        lastError = err.message;
        logger.warn(`[GeminiLLMProvider] Model ${model} exception: ${lastError}`);
      }
    }

    logger.warn('[GeminiLLMProvider] Gemini models rate-limited or busy. Extracting spoken content directly for target field...');
    
    // Direct transcript extraction fallback so the user's form box populates immediately with what they spoke
    const cleanText = transcript.trim();
    if (cleanText) {
      const extracted: ExtractedProductData = {
        product_name: targetField === 'name' || !targetField || targetField === 'all' ? cleanText : null,
        description: targetField === 'description' || !targetField || targetField === 'all' ? cleanText : null,
        category: null,
        subcategory: null,
        material: targetField === 'material' ? cleanText : null,
        color: targetField === 'color' ? cleanText : null,
        craft_type: targetField === 'craft_type' ? cleanText : null,
        features: targetField === 'features' ? [cleanText] : [],
        production_time: null,
        price: targetField === 'price' ? parseFloat(cleanText.replace(/[^0-9.]/g, '')) || null : null,
        stock_quantity: targetField === 'stock' || targetField === 'stock_quantity' ? parseInt(cleanText.replace(/[^0-9]/g, ''), 10) || null : null,
        keywords: [cleanText],
        uncertain_fields: [],
        missing_fields: [],
        needs_clarification: false,
        clarification_message: null,
        target_field: targetField || null,
      };
      return extracted;
    }

    logger.error('[GeminiLLMProvider] All extraction models failed:', lastError);
    throw Object.assign(
      new Error(
        lastError.includes('quota') || lastError.includes('limit')
          ? 'AI product understanding service is temporarily busy due to high demand. Please try again in a few seconds.'
          : lastError || 'Unable to structure product details from transcript.'
      ),
      { code: 'AI_EXTRACTION_FAILED', statusCode: 502 }
    );
  }
}

/**
 * ProductUnderstandingService Factory
 */
export class ProductUnderstandingService {
  private provider: ProductUnderstandingProvider;

  constructor() {
    if (env.aiMockMode || env.nodeEnv === 'test') {
      this.provider = new MockLLMProvider();
    } else if (env.geminiApiKey) {
      this.provider = new GeminiLLMProvider();
    } else {
      this.provider = new MockLLMProvider();
    }
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async extract(
    transcript: string,
    detectedLanguage: string,
    targetField?: string,
    questionLanguage?: string
  ): Promise<ExtractedProductData> {
    return this.provider.extractProductData(transcript, detectedLanguage, targetField, questionLanguage);
  }
}

export const productUnderstandingService = new ProductUnderstandingService();
