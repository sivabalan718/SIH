import fs from 'fs';
import path from 'path';
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

// In-Memory Storage Cache & Local Safeguard
const inMemoryCatalogueStore = new Map<string, ProductCatalogueRecord>();

const DISK_BACKUP_PATH = path.resolve(process.cwd(), 'src/data/catalogues_backup.json');

function saveCataloguesToDisk() {
  try {
    const dir = path.dirname(DISK_BACKUP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = Array.from(inMemoryCatalogueStore.values());
    fs.writeFileSync(DISK_BACKUP_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e: any) {
    logger.warn(`[CatalogueService] Unable to save catalogue backup to disk: ${e.message}`);
  }
}

function loadCataloguesFromDisk() {
  try {
    if (fs.existsSync(DISK_BACKUP_PATH)) {
      const raw = fs.readFileSync(DISK_BACKUP_PATH, 'utf-8');
      const items: ProductCatalogueRecord[] = JSON.parse(raw);
      for (const item of items) {
        inMemoryCatalogueStore.set(getStoreKey(item.product_id, item.language), item);
      }
      logger.info(`[CatalogueService] Restored ${items.length} catalogue records from local cache.`);
    }
  } catch (e: any) {
    logger.warn(`[CatalogueService] Could not read disk catalogue backup: ${e.message}`);
  }
}

// Initial restore on module load
loadCataloguesFromDisk();

function getStoreKey(productId: string, language: CatalogueLanguage): string {
  return `${productId}:${language}`;
}

/**
 * Save or update catalogue content for a specific product and language.
 * Supabase is the canonical persistent store.
 * Protects artisan manual edits from automated overwrite.
 */
export async function saveCatalogueContent(
  productId: string,
  artisanId: string,
  language: CatalogueLanguage,
  content: GeneratedCatalogueContent,
  toneStyle: CatalogueStyle = 'PROFESSIONAL',
  generatedBy: 'm63' | 'artisan' = 'm63',
  forceOverwrite: boolean = false
): Promise<ProductCatalogueRecord> {
  const now = new Date().toISOString();
  const key = getStoreKey(productId, language);

  // Check if existing record was manually edited by artisan
  const existingRecord = await getCatalogueContent(productId, language);
  if (existingRecord && existingRecord.generated_by === 'artisan' && generatedBy === 'm63' && !forceOverwrite) {
    logger.info(`[CatalogueService] Preserving artisan-edited catalogue for product ${productId} (${language})`);
    return existingRecord;
  }

  // Clean specifications and highlights to remove internal/debug values
  const cleanHighlights = (content.highlights || []).filter(
    (h) => h && !h.includes('DEMO_SEED_DATASET') && !h.includes('__DEBUG__')
  );
  const cleanTags = (content.tags || []).filter(
    (t) => t && !t.includes('DEMO_SEED_DATASET') && !t.includes('__DEBUG__')
  );

  const cleanSpecs: Record<string, string> = {};
  if (content.specifications) {
    for (const [k, v] of Object.entries(content.specifications)) {
      if (v && v !== 'None' && !v.includes('DEMO_SEED_DATASET')) {
        cleanSpecs[k] = v;
      }
    }
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('product_catalogue_content')
      .upsert(
        {
          product_id: productId,
          artisan_id: artisanId,
          language,
          title: content.title.trim(),
          short_description: content.shortDescription.trim(),
          description: content.description.trim(),
          highlights: cleanHighlights,
          specifications: cleanSpecs,
          care_instructions: content.careInstructions || '',
          tags: cleanTags,
          tone_style: toneStyle,
          generated_by: generatedBy,
          updated_at: now,
        },
        { onConflict: 'product_id,language' }
      )
      .select()
      .single();

    if (error) {
      logger.warn(`[CatalogueService] Supabase upsert notice (${error.message}); updating memory cache`);
      throw error;
    }

    const savedRecord = data as ProductCatalogueRecord;
    inMemoryCatalogueStore.set(key, savedRecord);
    saveCataloguesToDisk();
    logger.info(`[CatalogueService] Canonical catalogue saved to Supabase for product ${productId} (${language})`);
    return savedRecord;
  } catch (err: any) {
    // Fallback cache if Supabase table is not yet migrated
    const existing = inMemoryCatalogueStore.get(key);
    const record: ProductCatalogueRecord = {
      id: existing?.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      product_id: productId,
      artisan_id: artisanId,
      language,
      title: content.title.trim(),
      short_description: content.shortDescription.trim(),
      description: content.description.trim(),
      highlights: cleanHighlights,
      specifications: cleanSpecs,
      care_instructions: content.careInstructions || '',
      tags: cleanTags,
      tone_style: toneStyle,
      generated_by: generatedBy,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    inMemoryCatalogueStore.set(key, record);
    saveCataloguesToDisk();
    logger.info(`[CatalogueService] Catalogue saved to local cache for product ${productId} (${language})`);
    return record;
  }
}

/**
 * Get catalogue content for a specific product and language.
 * Queries Supabase canonical database first, falling back to cache.
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

    if (artisanId && artisanId !== 'any') {
      query = query.eq('artisan_id', artisanId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      // Sync memory cache
      inMemoryCatalogueStore.set(getStoreKey(productId, language), data as ProductCatalogueRecord);
      return data as ProductCatalogueRecord;
    }
  } catch (err: any) {
    // Continue to fallback
  }

  const key = getStoreKey(productId, language);
  const memRecord = inMemoryCatalogueStore.get(key);
  if (memRecord && (!artisanId || artisanId === 'any' || memRecord.artisan_id === artisanId)) {
    return memRecord;
  }
  return null;
}

/**
 * High-performance batch catalogue lookup for multiple products in a single database query.
 * Eliminates the N+1 query problem on Marketplace listing pages.
 */
export async function getBatchCatalogueContent(
  productIds: string[],
  language: CatalogueLanguage
): Promise<Map<string, ProductCatalogueRecord>> {
  const resultMap = new Map<string, ProductCatalogueRecord>();
  if (!productIds || productIds.length === 0) {
    return resultMap;
  }

  // 1. Attempt batch query from Supabase canonical store
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('product_catalogue_content')
      .select('*')
      .in('product_id', productIds)
      .eq('language', language);

    if (!error && data && Array.isArray(data)) {
      for (const record of data) {
        resultMap.set(record.product_id, record as ProductCatalogueRecord);
        inMemoryCatalogueStore.set(getStoreKey(record.product_id, record.language), record as ProductCatalogueRecord);
      }
    }
  } catch (err: any) {
    // Continue to check cache
  }

  // 2. Check local cache for any product IDs not returned by Supabase
  for (const pid of productIds) {
    if (!resultMap.has(pid)) {
      const cached = inMemoryCatalogueStore.get(getStoreKey(pid, language));
      if (cached) {
        resultMap.set(pid, cached);
      }
    }
  }

  return resultMap;
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

/**
 * Helper to check if a product has a complete, valid catalogue in English
 */
export function isCatalogueComplete(record: ProductCatalogueRecord | null): boolean {
  if (!record) return false;
  return Boolean(
    record.title &&
      record.title.trim().length > 3 &&
      record.short_description &&
      record.short_description.trim().length > 10 &&
      record.description &&
      record.description.trim().length > 20
  );
}
