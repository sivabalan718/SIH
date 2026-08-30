import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import {
  PricingLanguage,
  ConfidenceLevel,
  ProductionTimeUnit,
  FairPriceRecommendation,
} from './ai/pricing-intelligence.service.js';

export interface ProductPricingRecord {
  id: string;
  product_id: string;
  artisan_id: string;

  // Cost Inputs
  material_cost: number | null;
  labour_cost: number | null;
  other_expenses: number | null;
  production_time: number | null;
  production_time_unit: ProductionTimeUnit | null;
  known_cost: number;

  // Recommendation
  fair_price_min: number | null;
  fair_price_max: number | null;
  suggested_price: number | null;
  confidence: ConfidenceLevel;
  factors: string[];
  explanation: string;
  missing_information: string[];
  assumptions: string[];

  // Artisan Decisions
  recommendation_status: 'none' | 'applied' | 'kept' | 'outdated';
  active_language: PricingLanguage;
  created_at: string;
  updated_at: string;
}

export interface SavePricingRecordInput {
  material_cost?: number | null;
  labour_cost?: number | null;
  other_expenses?: number | null;
  production_time?: number | null;
  production_time_unit?: ProductionTimeUnit | null;
  recommendation?: FairPriceRecommendation | null;
  recommendation_status?: 'none' | 'applied' | 'kept' | 'outdated';
  active_language?: PricingLanguage;
}

// In-Memory Storage Fallback for local development if Supabase table is absent
const inMemoryPricingStore = new Map<string, ProductPricingRecord>();

function getStoreKey(productId: string, artisanId: string): string {
  return `${productId}:${artisanId}`;
}

/**
 * Save or update pricing intelligence record for a product and artisan
 */
export async function savePricingRecord(
  productId: string,
  artisanId: string,
  input: SavePricingRecordInput
): Promise<ProductPricingRecord> {
  const now = new Date().toISOString();
  const mat = input.material_cost !== undefined ? input.material_cost : null;
  const lab = input.labour_cost !== undefined ? input.labour_cost : null;
  const oth = input.other_expenses !== undefined ? input.other_expenses : null;
  const knownCost = (mat || 0) + (lab || 0) + (oth || 0);

  const rec = input.recommendation;

  const recordPayload = {
    product_id: productId,
    artisan_id: artisanId,
    material_cost: mat,
    labour_cost: lab,
    other_expenses: oth,
    production_time: input.production_time !== undefined ? input.production_time : null,
    production_time_unit: input.production_time_unit || 'days',
    known_cost: knownCost,
    fair_price_min: rec?.fair_price_min ?? null,
    fair_price_max: rec?.fair_price_max ?? null,
    suggested_price: rec?.suggested_price ?? null,
    confidence: rec?.confidence || 'medium',
    factors: rec?.factors_considered || (rec as any)?.factors || [],
    explanation: rec?.price_justification || (rec as any)?.explanation || '',
    missing_information: rec?.missing_information || [],
    assumptions: rec?.assumptions || [],
    recommendation_status: input.recommendation_status || 'none',
    active_language: input.active_language || 'en',
    updated_at: now,
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('product_pricing_intelligence')
      .upsert(
        {
          ...recordPayload,
        },
        { onConflict: 'product_id' }
      )
      .select()
      .single();

    if (error) {
      logger.warn(`[PricingService] Supabase upsert notice (${error.message}); writing to local memory store`);
      throw error;
    }

    logger.info(`[PricingService] Pricing record saved to DB for product ${productId}`);
    return data as ProductPricingRecord;
  } catch (err: any) {
    const key = getStoreKey(productId, artisanId);
    const existing = inMemoryPricingStore.get(key);

    const record: ProductPricingRecord = {
      id: existing?.id || `pricing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...recordPayload,
      created_at: existing?.created_at || now,
    };

    inMemoryPricingStore.set(key, record);
    logger.info(`[PricingService] Pricing stored in local memory for product ${productId}`);
    return record;
  }
}

/**
 * Get pricing intelligence record for a product and artisan (ownership enforced)
 */
export async function getPricingRecord(
  productId: string,
  artisanId: string
): Promise<ProductPricingRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('product_pricing_intelligence')
      .select('*')
      .eq('product_id', productId)
      .eq('artisan_id', artisanId)
      .single();

    if (error || !data) {
      const key = getStoreKey(productId, artisanId);
      const memRecord = inMemoryPricingStore.get(key);
      if (memRecord && memRecord.artisan_id === artisanId) {
        return memRecord;
      }
      return null;
    }

    return data as ProductPricingRecord;
  } catch (err: any) {
    const key = getStoreKey(productId, artisanId);
    const memRecord = inMemoryPricingStore.get(key);
    if (memRecord && memRecord.artisan_id === artisanId) {
      return memRecord;
    }
    return null;
  }
}
