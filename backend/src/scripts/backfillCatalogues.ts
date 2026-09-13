import { getSupabaseAdmin } from '../config/supabase.js';
import { getProductsByArtisan, ProductRecord } from '../services/product.service.js';
import {
  saveCatalogueContent,
  getCatalogueContent,
  getBatchCatalogueContent,
  isCatalogueComplete,
} from '../services/catalogue.service.js';
import { generateCatalogueContent } from '../services/ai/catalogue-generation.service.js';
import { logger } from '../utils/logger.js';

interface BackfillSummary {
  totalProducts: number;
  alreadyComplete: number;
  generated: number;
  failed: number;
  demoFlagsScrubbed: number;
  failures: Array<{ productId: string; name: string; reason: string }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrubDemoFlagsFromDatabase(products: ProductRecord[]): Promise<number> {
  const supabase = getSupabaseAdmin();
  let scrubbedCount = 0;

  for (const prod of products) {
    if (Array.isArray(prod.features) && prod.features.some((f) => f && f.includes('DEMO_SEED_DATASET'))) {
      const cleanFeatures = prod.features.filter((f) => f && !f.includes('DEMO_SEED_DATASET') && !f.includes('__DEBUG__'));
      try {
        await supabase
          .from('products')
          .update({ features: cleanFeatures, updated_at: new Date().toISOString() })
          .eq('id', prod.id);
        prod.features = cleanFeatures;
        scrubbedCount++;
      } catch (e: any) {
        logger.warn(`[ScrubDemoFlags] Could not scrub features for ${prod.id}: ${e.message}`);
      }
    }
  }

  return scrubbedCount;
}

export async function runCatalogueBackfill(): Promise<BackfillSummary> {
  console.log('================================================================');
  console.log('M63 SMART CATALOGUE — AUTOMATIC MARKETPLACE BACKFILL PIPELINE');
  console.log('================================================================\n');

  const supabase = getSupabaseAdmin();

  // 1. Load all products from Supabase
  let dbProducts: ProductRecord[] = [];
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      dbProducts = data as ProductRecord[];
    }
  } catch (e: any) {
    logger.warn(`[Backfill] Supabase products fetch notice: ${e.message}`);
  }

  // Combine with fallback store
  let memProducts: ProductRecord[] = [];
  try {
    memProducts = await getProductsByArtisan('all');
  } catch (e) {}

  const productMap = new Map<string, ProductRecord>();
  for (const p of [...dbProducts, ...memProducts]) {
    if (p && p.id) {
      productMap.set(p.id, p);
    }
  }

  const allProducts = Array.from(productMap.values());
  const summary: BackfillSummary = {
    totalProducts: allProducts.length,
    alreadyComplete: 0,
    generated: 0,
    failed: 0,
    demoFlagsScrubbed: 0,
    failures: [],
  };

  console.log(`Loaded ${allProducts.length} total products for audit.`);

  // 2. Scrub DEMO_SEED_DATASET flags from product features
  summary.demoFlagsScrubbed = await scrubDemoFlagsFromDatabase(allProducts);
  if (summary.demoFlagsScrubbed > 0) {
    console.log(`✓ Cleaned DEMO_SEED_DATASET flags from ${summary.demoFlagsScrubbed} product records.\n`);
  }

  // 3. Audit existing catalogue records via instant batch queries
  const allIds = allProducts.map((p) => p.id);
  const enMap = await getBatchCatalogueContent(allIds, 'en');
  const taMap = await getBatchCatalogueContent(allIds, 'ta');
  const hiMap = await getBatchCatalogueContent(allIds, 'hi');

  const toProcess: ProductRecord[] = [];

  for (const prod of allProducts) {
    const existingEn = enMap.get(prod.id) || null;
    const existingTa = taMap.get(prod.id) || null;
    const existingHi = hiMap.get(prod.id) || null;

    // If all 3 languages exist and EN is complete and valid, mark as complete
    if (isCatalogueComplete(existingEn) && existingTa && existingHi) {
      summary.alreadyComplete++;
    } else {
      toProcess.push(prod);
    }
  }

  console.log(`Audit Summary:`);
  console.log(`  - Already Complete & Valid: ${summary.alreadyComplete}`);
  console.log(`  - Needing Generation / Backfill: ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log('🎉 All products already possess complete, canonical Smart Catalogues!\n');
    return summary;
  }

  // 4. Controlled Batch Processing (Batch size: 4, Delay: 1500ms)
  const BATCH_SIZE = 4;
  const DELAY_MS = 1500;
  const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batch = toProcess.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    console.log(`Processing Batch ${b + 1}/${totalBatches} (${batch.length} products)...`);

    for (const prod of batch) {
      try {
        const prodInput = {
          name: prod.name,
          description: prod.description || undefined,
          category: prod.category || undefined,
          subcategory: prod.subcategory || undefined,
          material: prod.material || undefined,
          color: prod.color || undefined,
          craft_type: prod.craft_type || undefined,
          features: prod.features || [],
          price: prod.price,
          stock_quantity: prod.stock_quantity,
        };

        // EN catalogue
        const existingEn = await getCatalogueContent(prod.id, 'en', prod.artisan_id);
        if (!existingEn || existingEn.generated_by !== 'artisan') {
          const enContent = await generateCatalogueContent(prodInput, 'en', 'PROFESSIONAL');
          await saveCatalogueContent(prod.id, prod.artisan_id, 'en', enContent, 'PROFESSIONAL', 'm63');
        }

        // TA catalogue
        const existingTa = await getCatalogueContent(prod.id, 'ta', prod.artisan_id);
        if (!existingTa || existingTa.generated_by !== 'artisan') {
          const taContent = await generateCatalogueContent(prodInput, 'ta', 'PROFESSIONAL');
          await saveCatalogueContent(prod.id, prod.artisan_id, 'ta', taContent, 'PROFESSIONAL', 'm63');
        }

        // HI catalogue
        const existingHi = await getCatalogueContent(prod.id, 'hi', prod.artisan_id);
        if (!existingHi || existingHi.generated_by !== 'artisan') {
          const hiContent = await generateCatalogueContent(prodInput, 'hi', 'PROFESSIONAL');
          await saveCatalogueContent(prod.id, prod.artisan_id, 'hi', hiContent, 'PROFESSIONAL', 'm63');
        }

        summary.generated++;
        console.log(`  ✓ [${prod.id.substring(0, 8)}] Generated: "${prod.name}"`);
      } catch (err: any) {
        summary.failed++;
        summary.failures.push({
          productId: prod.id,
          name: prod.name,
          reason: err?.message || 'Unknown generation error',
        });
        console.error(`  ✗ [${prod.id.substring(0, 8)}] Failed: "${prod.name}" - ${err?.message}`);
      }
    }

    if (b < totalBatches - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n================================================================');
  console.log('CATALOGUE BACKFILL FINAL REPORT');
  console.log('================================================================');
  console.log(`Total Products Audited:    ${summary.totalProducts}`);
  console.log(`Already Complete (Kept):   ${summary.alreadyComplete}`);
  console.log(`Newly Generated (EN/TA/HI):${summary.generated}`);
  console.log(`Generation Failures:       ${summary.failed}`);
  console.log(`Demo Flags Scrubbed:       ${summary.demoFlagsScrubbed}`);

  if (summary.failures.length > 0) {
    console.log('\nFailures Details:');
    for (const f of summary.failures) {
      console.log(`  - [${f.productId}] ${f.name}: ${f.reason}`);
    }
  }

  console.log('================================================================\n');
  return summary;
}

// Run when called directly from CLI
if (process.argv[1]?.includes('backfillCatalogues')) {
  runCatalogueBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backfill script fatal error:', err);
      process.exit(1);
    });
}
