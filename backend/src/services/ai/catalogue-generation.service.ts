import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

export type CatalogueLanguage = 'en' | 'ta' | 'hi';
export type CatalogueStyle = 'PROFESSIONAL' | 'SIMPLE' | 'TRADITIONAL';

export interface StructuredProductInput {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  color?: string;
  craft_type?: string;
  features?: string[];
  price?: number;
  stock_quantity?: number;
  production_time?: string;
  size?: string;
  dimensions?: string;
  weight?: string;
  care_instructions?: string;
  customization_info?: string;
  other_attributes?: Record<string, string>;
}

export interface GeneratedCatalogueContent {
  title: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  careInstructions: string;
  tags: string[];
}

const catalogueSchema = z.object({
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  highlights: z.array(z.string()).min(1),
  specifications: z.record(z.string(), z.string()),
  careInstructions: z.string().default(''),
  tags: z.array(z.string()).min(1),
});

/**
 * AI Smart Catalogue Generation Service (Phase 5.1 Content Expansion & Synthesis Engine)
 * Transforms structured product facts into rich, descriptive, customer-facing catalogue content.
 */
/** After a quota/rate-limit error, skip Gemini for a while instead of failing every request. */
let geminiCooldownUntil = 0;
export function isGeminiCoolingDown(): boolean {
  return Date.now() < geminiCooldownUntil;
}

export async function generateCatalogueContent(
  input: StructuredProductInput,
  language: CatalogueLanguage = 'en',
  style: CatalogueStyle = 'PROFESSIONAL',
  sectionToRegenerate?: string
): Promise<GeneratedCatalogueContent> {
  const apiKey = env.geminiApiKey;
  if (apiKey && isGeminiCoolingDown()) {
    return generateFallbackCatalogue(input, language, style);
  }
  if (!apiKey) {
    logger.warn('[CatalogueGen] Gemini API Key not configured; returning structured fallback');
    return generateFallbackCatalogue(input, language, style);
  }

  try {
    const langInstructions: Record<CatalogueLanguage, string> = {
      en: 'English language suitable for e-commerce customers',
      ta: 'natural, fluent Tamil (தமிழ்) suitable for Indian marketplace customers',
      hi: 'natural, fluent Hindi (हिन्दी) suitable for Indian marketplace customers',
    };

    const styleInstructions: Record<CatalogueStyle, string> = {
      PROFESSIONAL: `
- PURPOSE: E-commerce / marketplace product listing.
- CHARACTERISTICS: Polished, commercially presentable, buyer-oriented, structured, moderately detailed, clear product terminology.
- FOCUS: Synthesize product identity, material composition, craft methodology, and verified features. Avoid exaggerated advertising claims.`,
      SIMPLE: `
- PURPOSE: Easy understanding for everyday customers.
- CHARACTERISTICS: Short sentences, simple vocabulary, direct explanation, easy reading, minimal marketing language.
- FOCUS: Clearly explain what it is, what it is made from, and what makes it practical. Avoid complex technical jargon.`,
      TRADITIONAL: `
- PURPOSE: Highlight craftsmanship and artisan character.
- CHARACTERISTICS: Storytelling-oriented, warm, craft-focused, expressive, emphasizing hand making process and dedication.
- FOCUS: Focus on material feel, handwork, patient technique, and artisan effort.
- RESTRICTION: NEVER invent historical origins, cultural heritage, geographic origins, family traditions, years of experience, or religious significance unless provided in facts.`,
    };

    const prompt = `You are the M63 AI Smart Catalogue Intelligence Engine for craft artisans.
Your task is to synthesize the provided product facts into a complete, high-quality, marketplace-ready product catalogue in ${langInstructions[language]}.

CATALOGUE STYLE: ${style}
Style Guidelines:
${styleInstructions[style]}

CONTEXT EXPANSION MANDATE:
Do NOT simply repeat or copy-paste raw short sentences provided by the artisan (e.g. "Blue cotton saree, handwoven, takes 3 days").
Instead, intelligently transform all supplied facts into well-structured, natural catalogue prose that explains product details, craftsmanship, material texture, and production effort in a cohesive narrative appropriate for the chosen style.

CRITICAL ZERO-HALLUCINATION RULES (STRICTLY ENFORCED):
1. Use ONLY the provided product facts. DO NOT invent facts such as 100% organic cotton, Mulberry silk, specific geographic origin, awards, historical claims, eco-friendly certifications, or unstated dimensions.
2. NEVER invent washing/care instructions unless they are safely derived directly from the supplied material/craft type (e.g. cotton -> hand wash separately in cold water). If unsure, leave careInstructions as an empty string.
3. NEVER invent prices, stock, materials, historical heritage, or customization options.
4. If a product field is missing or unknown, leave it out of the prose and specifications table.

Input Structured Product Facts:
- Product Name: ${input.name || 'Artisan Craft'}
- Description / Artisan Story: ${input.description || 'None provided'}
- Material: ${input.material || 'None'}
- Craft Technique: ${input.craft_type || 'None'}
- Category: ${input.category || 'None'} ${input.subcategory ? `(${input.subcategory})` : ''}
- Colour / Design: ${input.color || 'None'}
- Features / Highlights: ${input.features && input.features.length ? input.features.join(', ') : 'None'}
- Production Time: ${input.production_time || 'None'}
- Size / Dimensions: ${input.dimensions || input.size || 'None'}
- Weight: ${input.weight || 'None'}
- Customization: ${input.customization_info || 'None'}
- Price: ${input.price ? `₹${input.price}` : 'None'}

${sectionToRegenerate ? `Special Instructions: Regenerate the section "${sectionToRegenerate}" with fresh wording.` : ''}

Respond ONLY with a valid JSON object strictly matching this schema:
{
  "title": "Concise marketplace product title based strictly on facts",
  "shortDescription": "2-3 well-written summary sentences for product card display",
  "description": "Rich, expanded full product description combining identity, material, craft technique, and making process naturally",
  "highlights": ["3 to 5 clear bullet points of verified product facts"],
  "specifications": {
    "Material": "${input.material || ''}",
    "Craft Technique": "${input.craft_type || ''}"
  },
  "careInstructions": "Safe care guidance derived ONLY from known material/craft, or empty string if unavailable",
  "tags": ["3 to 6 relevant search tags"]
}`;

    const models = [
      env.geminiLlmModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ].filter(Boolean);

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: style === 'TRADITIONAL' ? 0.3 : 0.2,
            },
          }),
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text();
          logger.warn(`[CatalogueGen] Model ${model} returned error ${res.status}: ${errText.slice(0, 200)}`);
          if (res.status === 429) {
            geminiCooldownUntil = Date.now() + 15 * 60 * 1000;
            logger.warn('[CatalogueGen] Gemini quota reached - using the faithful generator for 15 minutes.');
            break;
          }
          continue;
        }

        const data = (await res.json()) as any;
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleanJsonStr = rawText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        // Sanitize specifications object to remove empty entries
        if (parsed.specifications) {
          Object.keys(parsed.specifications).forEach((k) => {
            if (!parsed.specifications[k] || parsed.specifications[k] === 'None' || parsed.specifications[k] === '') {
              delete parsed.specifications[k];
            }
          });
        }

        const validated = catalogueSchema.parse(parsed);
        logger.info(`[CatalogueGen] Successfully generated ${language} (${style}) catalogue via ${model}`);
        return validated;
      } catch (e: any) {
        logger.warn(`[CatalogueGen] Model ${model} attempt failed: ${e?.message}`);
      }
    }

    logger.warn('[CatalogueGen] All Gemini models failed; returning deterministic fallback');
    return generateFallbackCatalogue(input, language, style);
  } catch (err: any) {
    logger.error('[CatalogueGen] Error generating catalogue:', err?.message);
    return generateFallbackCatalogue(input, language, style);
  }
}

/**
 * Faithful deterministic generator (used when Gemini is unavailable or over quota).
 * Uses ONLY what the artisan recorded: their own description and features verbatim, plus
 * structured fields. It never adds quality claims, techniques or care advice that were not given.
 */
const SPEC_LABELS: Record<string, Record<CatalogueLanguage, string>> = {
  material: { en: 'Material', ta: 'பொருள்', hi: 'सामग्री' },
  craft: { en: 'Craft Technique', ta: 'கைவினை முறை', hi: 'शिल्प तकनीक' },
  category: { en: 'Category', ta: 'வகை', hi: 'श्रेणी' },
  subcategory: { en: 'Type', ta: 'உப வகை', hi: 'प्रकार' },
  color: { en: 'Colour', ta: 'நிறம்', hi: 'रंग' },
  productionTime: { en: 'Making Time', ta: 'தயாரிப்பு நேரம்', hi: 'निर्माण समय' },
  size: { en: 'Size', ta: 'அளவு', hi: 'आकार' },
  dimensions: { en: 'Dimensions', ta: 'பரிமாணங்கள்', hi: 'माप' },
  weight: { en: 'Weight', ta: 'எடை', hi: 'वज़न' },
  customization: { en: 'Customisation', ta: 'தனிப்பயனாக்கம்', hi: 'अनुकूलन' },
};

const ATTRIBUTE_LABELS: Record<string, Record<CatalogueLanguage, string>> = {
  dimensions: SPEC_LABELS.dimensions,
  capacity: { en: 'Capacity', ta: 'கொள்ளளவு', hi: 'क्षमता' },
  set_size: { en: 'Set / Pack', ta: 'தொகுப்பு', hi: 'सेट / पैक' },
  weight: SPEC_LABELS.weight,
  finish: { en: 'Finish', ta: 'மேற்பூச்சு', hi: 'फ़िनिश' },
  size: SPEC_LABELS.size,
  length: { en: 'Length', ta: 'நீளம்', hi: 'लंबाई' },
  intended_use: { en: 'Use', ta: 'பயன்பாடு', hi: 'उपयोग' },
  occasion: { en: 'Occasion', ta: 'சந்தர்ப்பம்', hi: 'अवसर' },
  customization: SPEC_LABELS.customization,
};

const firstSentence = (text: string) => {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = t.match(/^(.{20,220}?[.!?।])(\s|$)/);
  return m ? m[1] : t.slice(0, 220);
};

function generateFallbackCatalogue(
  input: StructuredProductInput,
  language: CatalogueLanguage,
  style: CatalogueStyle
): GeneratedCatalogueContent {
  const name = (input.name || '').trim() || 'Handmade product';
  const artisanText = (input.description || '').trim();
  const { material: mat, craft_type: craft, category: cat, subcategory: sub, color, production_time: prodTime } = input;
  const attrs: Record<string, string> = { ...(input.other_attributes || {}) };
  if (input.dimensions && !attrs.dimensions) attrs.dimensions = input.dimensions;
  if (input.size && !attrs.size) attrs.size = input.size;
  if (input.weight && !attrs.weight) attrs.weight = input.weight;
  const care = (input.care_instructions || attrs.care || '').trim();
  const customization = (input.customization_info || attrs.customization || '').trim();

  // Specifications: recorded facts only
  const specs: Record<string, string> = {};
  const put = (label: string, v?: string) => {
    if (v && String(v).trim()) specs[label] = String(v).trim();
  };
  put(SPEC_LABELS.material[language], mat);
  put(SPEC_LABELS.craft[language], craft);
  put(SPEC_LABELS.category[language], cat);
  put(SPEC_LABELS.subcategory[language], sub);
  put(SPEC_LABELS.color[language], color);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'care' || k === 'customization') continue;
    put(ATTRIBUTE_LABELS[k]?.[language] || k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()), v);
  }
  put(SPEC_LABELS.customization[language], customization);
  put(SPEC_LABELS.productionTime[language], prodTime);

  const features = (input.features || []).map((f) => f.trim()).filter(Boolean);
  const tags = [name, craft, mat, cat, sub].filter(Boolean) as string[];

  if (language === 'ta' || language === 'hi') {
    const L =
      language === 'ta'
        ? {
            made: `${name} — கைவினைஞரால் கையால் செய்யப்பட்டது.`,
            mat: mat ? `பொருள்: ${mat}.` : '',
            craft: craft ? `கைவினை முறை: ${craft}.` : '',
            color: color ? `நிறம்: ${color}.` : '',
            time: prodTime ? `தயாரிப்பு நேரம்: ${prodTime}.` : '',
            note: 'கைவினைஞரின் விவரம்',
            handmade: 'கையால் செய்யப்பட்டது',
          }
        : {
            made: `${name} — कारीगर द्वारा हाथ से बनाया गया।`,
            mat: mat ? `सामग्री: ${mat}।` : '',
            craft: craft ? `शिल्प तकनीक: ${craft}।` : '',
            color: color ? `रंग: ${color}।` : '',
            time: prodTime ? `निर्माण समय: ${prodTime}।` : '',
            note: 'कारीगर का विवरण',
            handmade: 'हस्तनिर्मित',
          };
    const factual = [L.made, L.mat, L.craft, L.color, L.time].filter(Boolean).join(' ');
    return {
      title: name,
      shortDescription: [L.made, L.mat || L.craft].filter(Boolean).join(' '),
      // The artisan's own words are kept (untranslated) rather than invented in translation.
      description: artisanText ? `${factual}\n\n${L.note}: ${artisanText}` : factual,
      highlights: [L.handmade, craft, mat, ...features].filter(Boolean).slice(0, 5) as string[],
      specifications: specs,
      careInstructions: care,
      tags,
    };
  }

  // English
  const facts: string[] = [];
  if (mat) facts.push(`Made from ${mat}`);
  if (craft) facts.push(`${mat ? 'using' : 'Made using'} ${craft}`);
  const factSentence = facts.length ? `${facts.join(' ')}.` : '';
  const lowerText = artisanText.toLowerCase();
  const shortDescription =
    artisanText.length >= 20
      ? firstSentence(artisanText)
      : `Handmade ${name}${mat ? ` in ${mat}` : ''}${craft ? `, crafted with ${craft}` : ''}.`;
  const descriptionParts = [
    artisanText,
    // Only add structured facts the artisan's text does not already mention
    factSentence && !(mat && lowerText.includes(mat.toLowerCase())) ? factSentence : '',
    color && !lowerText.includes(color.toLowerCase()) ? `Colour: ${color}.` : '',
    customization ? `Customisation: ${customization}.` : '',
    prodTime ? `Each piece takes about ${prodTime} to make.` : '',
  ].filter(Boolean);
  const description = descriptionParts.join(' ') || `${name} is handmade by an M63 artisan.`;

  const highlights = [
    ...features,
    craft ? `${style === 'TRADITIONAL' ? 'Traditional ' : ''}${craft}` : '',
    mat || '',
    'Handmade by the artisan',
  ].filter(Boolean);

  return {
    title: name,
    shortDescription,
    description,
    highlights: Array.from(new Set(highlights)).slice(0, 5),
    specifications: specs,
    careInstructions: care,
    tags,
  };
}
