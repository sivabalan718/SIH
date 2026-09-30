import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getBatchCatalogueContent, isCatalogueComplete, saveCatalogueContent } from './catalogue.service.js';
import { generateCatalogueContent, StructuredProductInput, CatalogueLanguage } from './ai/catalogue-generation.service.js';
import { getProductsByArtisan } from './product.service.js';

/** Map a stored product to the Smart Catalogue input — artisan-recorded fields only. */
export function productToCatalogueInput(prod: any): StructuredProductInput {
  const attrs: Record<string, string> = {};
  if (prod?.attributes && typeof prod.attributes === 'object') {
    for (const [k, v] of Object.entries(prod.attributes)) if (v !== null && v !== undefined && String(v).trim()) attrs[k] = String(v).trim();
  }
  return {
    name: prod.name,
    description: prod.description || undefined,
    category: prod.category || undefined,
    subcategory: prod.subcategory || undefined,
    material: prod.material || undefined,
    color: prod.color || undefined,
    craft_type: prod.craft_type || undefined,
    features: (prod.features || []).filter((f: string) => f && !f.includes('DEMO_SEED_DATASET') && !f.includes('__DEBUG__')),
    price: prod.price,
    stock_quantity: prod.stock_quantity,
    care_instructions: attrs.care,
    customization_info: attrs.customization,
    other_attributes: attrs,
  };
}

export interface CatalogueBackfillSummary {
  products: number;
  generated: number;
  alreadyComplete: number;
  failed: number;
}

let running: Promise<CatalogueBackfillSummary> | null = null;

/**
 * Ensure every PUBLISHED product has a complete Smart Catalogue in each language.
 * Sequential and idempotent; artisan-edited catalogues are never overwritten.
 */
export function ensureMarketplaceCatalogues(languages: CatalogueLanguage[] = ['en', 'ta', 'hi']): Promise<CatalogueBackfillSummary> {
  if (running) return running;
  running = (async () => {
    const summary: CatalogueBackfillSummary = { products: 0, generated: 0, alreadyComplete: 0, failed: 0 };
    const { data } = await getSupabaseAdmin().from('products').select('*').eq('status', 'PUBLISHED');
    const byId = new Map<string, any>((data || []).map((p: any) => [p.id, p]));
    try {
      for (const p of await getProductsByArtisan('all')) if (p.status === 'PUBLISHED' && !byId.has(p.id)) byId.set(p.id, p);
    } catch {
      // local fallback store unavailable — database products are enough
    }
    const products = Array.from(byId.values());
    summary.products = products.length;
    const ids = products.map((p) => p.id);

    for (const lang of languages) {
      const existing = await getBatchCatalogueContent(ids, lang);
      for (const prod of products) {
        const rec = existing.get(prod.id) || null;
        if (isCatalogueComplete(rec as any)) {
          summary.alreadyComplete++;
          continue;
        }
        try {
          const content = await generateCatalogueContent(productToCatalogueInput(prod), lang, 'PROFESSIONAL');
          await saveCatalogueContent(prod.id, prod.artisan_id, lang, content, 'PROFESSIONAL', 'm63');
          summary.generated++;
        } catch (e: any) {
          summary.failed++;
          logger.warn(`[CatalogueBackfill] ${prod.id} (${lang}) failed: ${e?.message}`);
        }
      }
    }
    logger.info(
      `[CatalogueBackfill] ${summary.products} published products · ${summary.generated} catalogues generated · ${summary.alreadyComplete} already complete · ${summary.failed} failed`
    );
    return summary;
  })().finally(() => {
    running = null;
  });
  return running;
}
