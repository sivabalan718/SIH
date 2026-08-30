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
export async function generateCatalogueContent(
  input: StructuredProductInput,
  language: CatalogueLanguage = 'en',
  style: CatalogueStyle = 'PROFESSIONAL',
  sectionToRegenerate?: string
): Promise<GeneratedCatalogueContent> {
  const apiKey = env.geminiApiKey;
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
          logger.warn(`[CatalogueGen] Model ${model} returned error ${res.status}: ${errText}`);
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
 * Rich Deterministic Fallback Generator
 * Generates distinct natural text for PROFESSIONAL, SIMPLE, and TRADITIONAL styles in EN, TA, and HI
 */
function generateFallbackCatalogue(
  input: StructuredProductInput,
  language: CatalogueLanguage,
  style: CatalogueStyle
): GeneratedCatalogueContent {
  const name = input.name || 'Artisan Product';
  const mat = input.material;
  const craft = input.craft_type;
  const cat = input.category || 'Craft';
  const color = input.color;
  const prodTime = input.production_time;

  const specs: Record<string, string> = {};
  if (mat) specs[language === 'ta' ? 'பொருள்' : language === 'hi' ? 'सामग्री' : 'Material'] = mat;
  if (craft) specs[language === 'ta' ? 'கைவினை முறை' : language === 'hi' ? 'शिल्प तकनीक' : 'Craft Technique'] = craft;
  if (cat) specs[language === 'ta' ? 'வகை' : language === 'hi' ? 'श्रेणी' : 'Category'] = cat;
  if (color) specs[language === 'ta' ? 'நிறம்' : language === 'hi' ? 'रंग' : 'Colour'] = color;
  if (prodTime) specs[language === 'ta' ? 'தயாரிப்பு நேரம்' : language === 'hi' ? 'निर्माण समय' : 'Production Time'] = prodTime;

  // --- TAMIL FALLBACK ---
  if (language === 'ta') {
    if (style === 'SIMPLE') {
      return {
        title: `${color ? `${color} ` : ''}${name}`,
        shortDescription: `இது ${craft ? `${craft} முறையில் ` : ''}${mat ? `${mat} பயன்படுத்தி ` : ''}செய்யப்பட்ட ${name}.`,
        description: `${name} திறமையான கைவினைஞர்களால் செய்யப்பட்டது. ${mat ? `இது ${mat} பொருளால் ஆனது.` : ''} ${craft ? `பாரம்பரிய ${craft} முறையில் உருவாக்கப்பட்டுள்ளது.` : ''} ${prodTime ? `இதை செய்ய சுமார் ${prodTime} ஆகிறது.` : ''}`,
        highlights: [
          craft ? `${craft} கைவினை முறை` : 'கைவினை தயாரிப்பு',
          mat ? `${mat} பொருள்` : 'தரமான பொருள்',
          color ? `${color} வண்ணம்` : 'அழகிய வடிவமைப்பு',
        ],
        specifications: specs,
        careInstructions: mat?.toLowerCase().includes('cotton') || mat?.toLowerCase().includes('பருத்தி')
          ? 'குளிர்ந்த நீரில் தனியாக துவைக்கவும்.'
          : 'மென்மையாக பராமரிக்கவும்.',
        tags: [name, craft || 'கைவினை', cat].filter(Boolean) as string[],
      };
    }

    if (style === 'TRADITIONAL') {
      return {
        title: `பாரம்பரிய ${craft ? `${craft} ` : ''}${name}`,
        shortDescription: `பாரம்பரிய ${craft ? `${craft} ` : ''}முறையில் ${mat ? `${mat} கொண்டு ` : ''}நெய்யப்பட்ட ${name}.`,
        description: `இந்த ${name} பாரம்பரிய கைவினை கலைத்திறனை பிரதிபலிக்கிறது. ${mat ? `${mat} பொருளைக் கொண்டு ` : ''}${craft ? `${craft} முறையில் ` : ''}கவனமாக தயாரிக்கப்பட்டுள்ளது. ${prodTime ? `ஒவ்வொரு தயாரிப்பும் உருவாக்க சுமார் ${prodTime} தேவைப்படுகிறது.` : ''} இது கைவினைஞரின் பிரத்யேக உழைப்பை காட்டுகிறது.`,
        highlights: [
          craft ? `பாரம்பரிய ${craft} கலை` : 'பாரம்பரிய கைவினை கலை',
          mat ? `உன்னதமான ${mat} பொருள்` : 'தரமான பொருள்',
          prodTime ? `${prodTime} கைவினை உழைப்பு` : 'சிறப்பான தயாரிப்பு',
        ],
        specifications: specs,
        careInstructions: 'குளிர்ந்த நீரில் மென்மையாக அலசி நிழலில் உலர்த்தவும்.',
        tags: [name, craft, mat, cat].filter(Boolean) as string[],
      };
    }

    // Professional Tamil
    return {
      title: `${craft ? `${craft} ` : ''}${color ? `${color} ` : ''}${name}`,
      shortDescription: `உயர்தர ${mat ? `${mat} ` : ''}${craft ? `${craft} ` : ''}${name}. சந்தை பயன்பாட்டிற்கு ஏற்ற சிறப்பான வடிவமைப்பு.`,
      description: `இந்த ${name} வணிக ரீதியிலான சந்தை தரத்திற்கு ஏற்ப வடிவமைக்கப்பட்டுள்ளது. ${mat ? `${mat} மூலப்பொருட்களைக் கொண்டும் ` : ''}${craft ? `${craft} முறையிலும் ` : ''}உருவாக்கப்பட்டுள்ளது. ${prodTime ? `தயாரிப்பு காலம்: ${prodTime}.` : ''} நீடித்து உழைக்கும் சிறந்த கலைப்படைப்பு.`,
      highlights: [
        craft ? `${craft} கைவினை திறன்` : 'சிறந்த கைவினை திறன்',
        mat ? `${mat} மூலப்பொருள்` : 'தரமான பொருள்',
        'சந்தை பயன்பாட்டிற்கு ஏற்ற வடிவமைப்பு',
      ],
      specifications: specs,
      careInstructions: 'உலர்ந்த நிலையில் பராமரிக்கவும்.',
      tags: [name, craft, mat, cat].filter(Boolean) as string[],
    };
  }

  // --- HINDI FALLBACK ---
  if (language === 'hi') {
    if (style === 'SIMPLE') {
      return {
        title: `${color ? `${color} ` : ''}${name}`,
        shortDescription: `यह ${craft ? `${craft} तकनीक से ` : ''}${mat ? `${mat} का उपयोग करके ` : ''}बनाया गया ${name} है।`,
        description: `${name} कुशल कारीगरों द्वारा तैयार किया गया है। ${mat ? `यह ${mat} सामग्री से बना है।` : ''} ${craft ? `इसे ${craft} शैली में बुना गया है।` : ''} ${prodTime ? `इसे बनाने में लगभग ${prodTime} का समय लगता है।` : ''}`,
        highlights: [
          craft ? `${craft} शिल्प शैली` : 'हस्तनिर्मित उत्पाद',
          mat ? `${mat} सामग्री` : 'गुणवत्तापूर्ण सामग्री',
          'सटीक हस्तकला',
        ],
        specifications: specs,
        careInstructions: mat?.toLowerCase().includes('cotton') || mat?.toLowerCase().includes('सूती')
          ? 'ठंडे पानी में अलग से धोएं।'
          : 'सावधानी से देखभाल करें।',
        tags: [name, craft || 'हस्तशिल्प', cat].filter(Boolean) as string[],
      };
    }

    if (style === 'TRADITIONAL') {
      return {
        title: `पारंपरिक ${craft ? `${craft} ` : ''}${name}`,
        shortDescription: `पारंपरिक ${craft ? `${craft} ` : ''}कला से ${mat ? `${mat} पर ` : ''}निर्मित ${name}।`,
        description: `यह ${name} पारंपरिक शिल्प कौशल और हस्तकला की धरोहर को दर्शाता है। ${mat ? `${mat} सामग्री ` : ''}${craft ? `और ${craft} तकनीक से ` : ''}इसे बहुत ध्यान से तैयार किया गया है। ${prodTime ? `प्रत्येक कृति को पूरा करने में लगभग ${prodTime} का समय लगता है।` : ''}`,
        highlights: [
          craft ? `पारंपरिक ${craft} कला` : 'पारंपरिक हस्तशिल्प',
          mat ? `शुद्ध ${mat} सामग्री` : 'उत्कृष्ट सामग्री',
          prodTime ? `${prodTime} की हस्तनिर्मित मेहनत` : 'कारीगरी',
        ],
        specifications: specs,
        careInstructions: 'ठंडे पानी में हाथ से धोएं और छाया में सुखाएं।',
        tags: [name, craft, mat, cat].filter(Boolean) as string[],
      };
    }

    // Professional Hindi
    return {
      title: `${craft ? `${craft} ` : ''}${color ? `${color} ` : ''}${name}`,
      shortDescription: `उच्च गुणवत्ता वाला ${mat ? `${mat} ` : ''}${craft ? `${craft} ` : ''}${name}। मार्केटप्लेस के लिए उपयुक्त।`,
      description: `यह ${name} बाजार के उच्च मानकों के अनुसार तैयार किया गया है। ${mat ? `इसमें ${mat} का उपयोग किया गया है ` : ''}${craft ? `और ${craft} तकनीक से फिनिशिंग दी गई है।` : ''} ${prodTime ? `उत्पादन समय: ${prodTime}।` : ''} टिकाऊ और आकर्षक डिजाइन।`,
      highlights: [
        craft ? `${craft} शिल्प कौशल` : 'उत्कृष्ट शिल्प',
        mat ? `${mat} सामग्री` : 'गुणवत्ता सामग्री',
        'व्यावसायिक गुणवत्ता',
      ],
      specifications: specs,
      careInstructions: 'सुखाने के लिए सीधी धूप से बचाएं।',
      tags: [name, craft, mat, cat].filter(Boolean) as string[],
    };
  }

  // --- ENGLISH FALLBACK ---
  if (style === 'SIMPLE') {
    return {
      title: `${color ? `${color} ` : ''}${name}`,
      shortDescription: `This is a ${mat ? `${mat} ` : ''}${name} made using ${craft || 'traditional handcraft'} techniques.`,
      description: `This ${name} is made by hand by skilled artisans. ${mat ? `It is made from ${mat} material.` : ''} ${craft ? `It uses a ${craft} technique.` : ''} ${color ? `It features a ${color} design.` : ''} ${prodTime ? `It takes about ${prodTime} to complete each piece.` : ''}`,
      highlights: [
        craft ? `${craft} technique` : 'Handcrafted design',
        mat ? `${mat} fabric` : 'Quality material',
        color ? `${color} colour pattern` : 'Artisan crafted',
        ...(input.features || []),
      ].slice(0, 5),
      specifications: specs,
      careInstructions: mat?.toLowerCase().includes('cotton')
        ? 'Hand wash separately in cold water.'
        : 'Handle gently.',
      tags: [name, craft, mat, cat].filter(Boolean) as string[],
    };
  }

  if (style === 'TRADITIONAL') {
    return {
      title: `Handcrafted ${craft ? `${craft} ` : ''}${name}`,
      shortDescription: `A traditional ${mat ? `${mat} ` : ''}${name} created through authentic ${craft || 'artisan'} craftsmanship.`,
      description: `This ${name} reflects the rich character of traditional handcrafting. ${mat ? `Woven using fine ${mat}, ` : ''}${craft ? `and formed through skilled ${craft} techniques, ` : ''}each piece carries the unique mark of artisan dedication. ${prodTime ? `The detailed making process takes approximately ${prodTime} to complete.` : ''}`,
      highlights: [
        craft ? `Traditional ${craft} heritage` : 'Artisan craftsmanship',
        mat ? `Authentic ${mat}` : 'Hand-selected material',
        prodTime ? `Crafted over ${prodTime}` : 'Handmade character',
        ...(input.features || []),
      ].slice(0, 5),
      specifications: specs,
      careInstructions: 'Hand wash gently in cold water and line dry in shade.',
      tags: [name, craft, mat, cat].filter(Boolean) as string[],
    };
  }

  // Professional English Default
  return {
    title: `Handcrafted ${color ? `${color} ` : ''}${craft ? `${craft} ` : ''}${name}`,
    shortDescription: `A professionally crafted ${mat ? `${mat} ` : ''}${name} featuring traditional ${craft || 'artisan'} techniques.`,
    description: `This ${name} is a high-quality catalogue item combining authentic craftsmanship with durable design. ${mat ? `Constructed from ${mat}, ` : ''}${craft ? `it incorporates traditional ${craft} methods ` : ''}to achieve a refined visual texture and structure. ${prodTime ? `Each unit requires approximately ${prodTime} of dedicated artisan production.` : ''}`,
    highlights: [
      craft ? `${craft} craftsmanship` : 'Artisan craftsmanship',
      mat ? `Premium ${mat} material` : 'Quality material',
      color ? `${color} palette` : 'Refined design',
      ...(input.features || []),
    ].slice(0, 5),
    specifications: specs,
    careInstructions: mat?.toLowerCase().includes('cotton')
      ? 'Hand wash separately in cold water and dry away from direct sunlight.'
      : 'Handle with care.',
    tags: [name, craft, mat, cat].filter(Boolean) as string[],
  };
}
