import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { CatalogueLanguage, CatalogueStyle, GeneratedCatalogueContent } from './ai/catalogue-generation.service.js';

export interface ProductCatalogueRecord {
  id: string;
  product_id: string;
  artisan_id: string;
  language: CatalogueLanguage;
  title: string;
  short_description: string;
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  care_instructions: string;
  tags: string[];
  tone_style: CatalogueStyle;
  generated_by: 'm63' | 'artisan';
  created_at: string;
  updated_at: string;
}

// In-Memory Storage Fallback for local development if Supabase table is absent
const inMemoryCatalogueStore = new Map<string, ProductCatalogueRecord>();

function getStoreKey(productId: string, language: CatalogueLanguage): string {
  return `${productId}:${language}`;
}

/**
 * Save or update catalogue content for a specific product and language
 */
export async function saveCatalogueContent(
  productId: string,
  artisanId: string,
  language: CatalogueLanguage,
  content: GeneratedCatalogueContent,
  toneStyle: CatalogueStyle = 'PROFESSIONAL',
  generatedBy: 'm63' | 'artisan' = 'm63'
): Promise<ProductCatalogueRecord> {
  const now = new Date().toISOString();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('product_catalogue_content')
      .upsert(
        {
          product_id: productId,
          artisan_id: artisanId,
          language,
          title: content.title,
          short_description: content.shortDescription,
          description: content.description,
          highlights: content.highlights,
          specifications: content.specifications,
          care_instructions: content.careInstructions,
          tags: content.tags,
          tone_style: toneStyle,
          generated_by: generatedBy,
          updated_at: now,
        },
        { onConflict: 'product_id,language' }
      )
      .select()
      .single();

    if (error) {
      logger.warn(`[CatalogueService] Supabase upsert notice (${error.message}); writing to local memory store`);
      throw error;
    }

    logger.info(`[CatalogueService] Catalogue saved to DB for product ${productId} (${language})`);
    return data as ProductCatalogueRecord;
  } catch (err: any) {
    const key = getStoreKey(productId, language);
    const existing = inMemoryCatalogueStore.get(key);

    const record: ProductCatalogueRecord = {
      id: existing?.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      product_id: productId,
      artisan_id: artisanId,
      language,
      title: content.title,
      short_description: content.shortDescription,
      description: content.description,
      highlights: content.highlights,
      specifications: content.specifications,
      care_instructions: content.careInstructions,
      tags: content.tags,
      tone_style: toneStyle,
      generated_by: generatedBy,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    inMemoryCatalogueStore.set(key, record);
    logger.info(`[CatalogueService] Catalogue stored in local memory for product ${productId} (${language})`);
    return record;
  }
}

/**
 * Get catalogue content for a specific product and language
 */
export async function getCatalogueContent(
  productId: string,
  language: CatalogueLanguage,
  artisanId?: string
): Promise<ProductCatalogueRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('product_catalogue_content')
      .select('*')
      .eq('product_id', productId)
      .eq('language', language);

    if (artisanId) {
      query = query.eq('artisan_id', artisanId);
    }

    const { data, error } = await query.single();
    if (error || !data) {
      const key = getStoreKey(productId, language);
      const memRecord = inMemoryCatalogueStore.get(key);
      if (memRecord && (!artisanId || memRecord.artisan_id === artisanId)) {
        return memRecord;
      }
      return null;
    }

    return data as ProductCatalogueRecord;
  } catch (err: any) {
    const key = getStoreKey(productId, language);
    const memRecord = inMemoryCatalogueStore.get(key);
    if (memRecord && (!artisanId || memRecord.artisan_id === artisanId)) {
      return memRecord;
    }
    return null;
  }
}

/**
 * Get all available language catalogues for a product (EN, TA, HI)
 */
export async function getAllLanguagesCatalogue(
  productId: string,
  artisanId?: string
): Promise<Record<CatalogueLanguage, ProductCatalogueRecord | null>> {
  const result: Record<CatalogueLanguage, ProductCatalogueRecord | null> = {
    en: null,
    ta: null,
    hi: null,
  };

  const languages: CatalogueLanguage[] = ['en', 'ta', 'hi'];
  for (const lang of languages) {
    result[lang] = await getCatalogueContent(productId, lang, artisanId);
  }

  return result;
}
