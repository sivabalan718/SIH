import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getCatalogueContent, getBatchCatalogueContent } from './catalogue.service.js';
import { ProductRecord, getProductsByArtisan, getProductById } from './product.service.js';

export interface MarketplaceProductItem {
  id: string;
  artisan_id: string;
  artisan_name: string;
  artisan_location: string;
  name: string;
  category: string;
  subcategory: string | null;
  material: string | null;
  craft_type: string | null;
  price: number;
  stock_quantity: number;
  is_in_stock: boolean;
  primary_image_url: string | null;
  short_description: string;
  full_description: string;
  highlights: string[];
  specifications: Record<string, string>;
  craft_information: string;
  care_instructions: string;
  available_languages: string[];
  created_at: string;
  rating_average?: number;
  /** Artisan-set original price; only present when genuinely higher than price. */
  mrp?: number | null;
  /** Category-aware structured attributes captured at registration (never invented). */
  attributes?: Record<string, string>;
  review_count?: number;
}

export interface MarketplaceFilterQuery {
  search?: string;
  category?: string;
  craft_type?: string;
  material?: string;
  artisan_id?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
  offset?: number;
}

function genuineMrp(prod: any): number | null {
  const mrp = Number(prod?.mrp);
  const price = Number(prod?.price);
  return Number.isFinite(mrp) && mrp > price ? mrp : null;
}

function cleanAttributes(raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (v !== null && v !== undefined && String(v).trim()) out[k] = String(v).trim();
    }
  }
  return out;
}

/** Real rating aggregates from verified reviews (single query for a page of products). */
async function getRatingSummaries(productIds: string[]): Promise<Map<string, { average: number; count: number }>> {
  const summaries = new Map<string, { average: number; count: number }>();
  if (productIds.length === 0) return summaries;
  try {
    const { data, error } = await getSupabaseAdmin().from('product_reviews').select('product_id, rating').in('product_id', productIds);
    if (error || !data) return summaries;
    const acc = new Map<string, { sum: number; count: number }>();
    for (const r of data as Array<{ product_id: string; rating: number }>) {
      const cur = acc.get(r.product_id) || { sum: 0, count: 0 };
      cur.sum += Number(r.rating) || 0;
      cur.count++;
      acc.set(r.product_id, cur);
    }
    for (const [id, v] of acc) summaries.set(id, { average: Math.round((v.sum / v.count) * 10) / 10, count: v.count });
  } catch (e: any) {
    logger.warn('[MarketplaceService] Rating summary unavailable:', e?.message);
  }
  return summaries;
}

function matchesMarketplaceFilter(p: any, f: MarketplaceFilterQuery): boolean {
  const has = (v: any, needle: string) => String(v || '').toLowerCase().includes(needle.toLowerCase());
  if (f.category && f.category !== 'All' && p.category !== f.category) return false;
  if (f.artisan_id && p.artisan_id !== f.artisan_id) return false;
  if (f.craft_type && !has(p.craft_type, f.craft_type)) return false;
  if (f.material && !has(p.material, f.material)) return false;
  if (f.min_price && Number(p.price) < f.min_price) return false;
  if (f.max_price && Number(p.price) > f.max_price) return false;
  if (f.search && f.search.trim()) {
    const t = f.search.trim();
    if (![p.name, p.category, p.craft_type, p.material, p.description].some((v) => has(v, t))) return false;
  }
  return true;
}

/**
 * List published marketplace products with filters and saved Smart Catalogue integration
 */
export async function getMarketplaceProducts(
  filter: MarketplaceFilterQuery = {},
  language: 'en' | 'ta' | 'hi' = 'en'
): Promise<{ products: MarketplaceProductItem[]; total: number }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('products')
    .select('*, artisans(name)', { count: 'exact' })
    .eq('status', 'PUBLISHED');

  if (filter.category && filter.category !== 'All') {
    query = query.eq('category', filter.category);
  }

  if (filter.artisan_id) {
    query = query.eq('artisan_id', filter.artisan_id);
  }

  if (filter.craft_type) {
    query = query.ilike('craft_type', `%${filter.craft_type}%`);
  }

  if (filter.material) {
    query = query.ilike('material', `%${filter.material}%`);
  }

  if (filter.min_price !== undefined && filter.min_price > 0) {
    query = query.gte('price', filter.min_price);
  }

  if (filter.max_price !== undefined && filter.max_price > 0) {
    query = query.lte('price', filter.max_price);
  }

  if (filter.search && filter.search.trim()) {
    const term = `%${filter.search.trim()}%`;
    query = query.or(`name.ilike.${term},category.ilike.${term},craft_type.ilike.${term},material.ilike.${term},description.ilike.${term}`);
  }

  // Sorting
  if (filter.sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (filter.sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else if (filter.sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const limit = Math.min(Math.max(filter.limit || 50, 1), 100);
  const offset = Math.max(filter.offset || 0, 0);

  let { data, error, count } = await query;

  if (error) {
    logger.warn('[MarketplaceService] Supabase join query notice, retrying plain select:', error.message);
    const fallbackQuery = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('status', 'PUBLISHED');
    const res = await fallbackQuery;
    data = res.data;
    count = res.count;
  }

  let dbList: any[] = data || [];
  let memList: any[] = [];
  try {
    const fallbackProds = await getProductsByArtisan('all');
    memList = fallbackProds.filter((p) => p.status === 'PUBLISHED');
  } catch (e) {}

  // DB rows and local-fallback rows are merged, so filters, sort and pagination are applied
  // once over the merged set (otherwise fallback rows would bypass every filter).
  const combinedMap = new Map<string, any>();
  for (const p of [...dbList, ...memList]) {
    // DB rows (with the artisans join) win over local-fallback copies of the same product.
    if (p && p.id && !combinedMap.has(p.id) && p.status === 'PUBLISHED' && matchesMarketplaceFilter(p, filter)) {
      combinedMap.set(p.id, p);
    }
  }

  const sortedList: any[] = Array.from(combinedMap.values()).sort((a, b) => {
    if (filter.sort === 'price_asc') return Number(a.price) - Number(b.price);
    if (filter.sort === 'price_desc') return Number(b.price) - Number(a.price);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  count = sortedList.length;
  let productsList: any[] = sortedList.slice(offset, offset + limit);

  // Batch-fetch all catalogues in a single database/memory pass
  const productIds = productsList.map((p) => p.id);
  const [cataloguesMap, ratings] = await Promise.all([
    getBatchCatalogueContent(productIds, language),
    getRatingSummaries(productIds),
  ]);

  const items: MarketplaceProductItem[] = productsList.map((prod) => {
    const catalogue = cataloguesMap.get(prod.id);

    const artisanInfo = prod.artisans || {};
    const artisanName = artisanInfo.name || 'Master Artisan';
    const locationParts = [artisanInfo.locality, artisanInfo.district, artisanInfo.state].filter(Boolean);
    // No artisan location is captured yet — never invent one.
    const artisanLocation = locationParts.length > 0 ? locationParts.join(', ') : '';

    // Canonical Smart Catalogue presentation priority
    const displayName = catalogue?.title || prod.name;
    const shortDesc =
      catalogue?.short_description ||
      prod.description ||
      `Handcrafted ${prod.craft_type || prod.category || 'artisan creation'} made from ${prod.material || 'traditional materials'}.`;
    const fullDesc = catalogue?.description || prod.description || shortDesc;

    // Filter out internal/debug flags such as DEMO_SEED_DATASET
    const rawHighlights = catalogue?.highlights && catalogue.highlights.length > 0
      ? catalogue.highlights
      : (prod.features || []);
    const cleanHighlights = rawHighlights.filter(
      (h: string) => h && !h.includes('DEMO_SEED_DATASET') && !h.includes('__DEBUG__')
    );

    const cleanSpecs: Record<string, string> = {};
    if (catalogue?.specifications && Object.keys(catalogue.specifications).length > 0) {
      for (const [k, v] of Object.entries(catalogue.specifications)) {
        if (v && v !== 'None' && !v.includes('DEMO_SEED_DATASET')) {
          cleanSpecs[k] = v;
        }
      }
    } else {
      if (prod.material) cleanSpecs['Material'] = prod.material;
      if (prod.craft_type) cleanSpecs['Craft Technique'] = prod.craft_type;
      if (prod.category) cleanSpecs['Category'] = prod.category;
    }

    return {
      id: prod.id,
      artisan_id: prod.artisan_id || 'artisan-default',
      artisan_name: artisanName,
      artisan_location: artisanLocation,
      name: displayName,
      category: prod.category || 'Handicrafts',
      subcategory: prod.subcategory || null,
      material: prod.material || null,
      craft_type: prod.craft_type || null,
      price: prod.price || 0,
      stock_quantity: prod.stock_quantity || 0,
      is_in_stock: (prod.stock_quantity || 0) > 0,
      primary_image_url: prod.primary_image_url || prod.original_image_url || null,
      short_description: shortDesc,
      full_description: fullDesc,
      highlights: cleanHighlights,
      specifications: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : { Material: prod.material || 'Artisan grade', Category: prod.category || 'Handicraft' },
      craft_information: catalogue?.description || '',
      care_instructions: catalogue?.care_instructions || '',
      available_languages: ['en', 'ta', 'hi'],
      mrp: genuineMrp(prod),
      attributes: cleanAttributes(prod.attributes),
      created_at: prod.created_at || new Date().toISOString(),
      rating_average: ratings.get(prod.id)?.average,
      review_count: ratings.get(prod.id)?.count || 0,
    };
  });

  return {
    products: items,
    total: count !== null && count !== undefined ? count : items.length,
  };
}

/**
 * Retrieve single marketplace product with full canonical Smart Catalogue.
 * Strictly guarantees catalogue.product_id === product.id.
 */
export async function getMarketplaceProductById(
  productId: string,
  language: 'en' | 'ta' | 'hi' = 'en'
): Promise<MarketplaceProductItem | null> {
  const supabase = getSupabaseAdmin();

  let { data, error } = await supabase
    .from('products')
    .select('*, artisans(name)')
    .eq('id', productId)
    .maybeSingle();

  if (error || !data) {
    const plainRes = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
    data = plainRes.data;
  }

  let prod: any = data;

  if (!prod) {
    try {
      prod = await getProductById(productId, 'any');
    } catch (e) {}
  }

  if (!prod || prod.status !== 'PUBLISHED') {
    return null;
  }

  // Retrieve canonical catalogue for this exact product and requested language
  const catalogue = await getCatalogueContent(productId, language);

  const artisanInfo = prod.artisans || {};
  const artisanName = artisanInfo.name || 'Master Artisan';
  const locationParts = [artisanInfo.locality, artisanInfo.district, artisanInfo.state].filter(Boolean);
  // No artisan location is captured yet — never invent one.
    const artisanLocation = locationParts.length > 0 ? locationParts.join(', ') : '';

  // Canonical Smart Catalogue presentation priority
  const displayName = catalogue?.title || prod.name;
  const shortDesc =
    catalogue?.short_description ||
    prod.description ||
    `Handcrafted ${prod.craft_type || prod.category || 'artisan creation'} made from ${prod.material || 'traditional materials'}.`;
  const fullDesc = catalogue?.description || prod.description || shortDesc;

  // Filter out internal/debug flags such as DEMO_SEED_DATASET
  const rawHighlights = catalogue?.highlights && catalogue.highlights.length > 0
    ? catalogue.highlights
    : (prod.features || []);
  const cleanHighlights = rawHighlights.filter(
    (h: string) => h && !h.includes('DEMO_SEED_DATASET') && !h.includes('__DEBUG__')
  );

  const cleanSpecs: Record<string, string> = {};
  if (catalogue?.specifications && Object.keys(catalogue.specifications).length > 0) {
    for (const [k, v] of Object.entries(catalogue.specifications)) {
      if (v && v !== 'None' && !v.includes('DEMO_SEED_DATASET')) {
        cleanSpecs[k] = v;
      }
    }
  } else {
    if (prod.material) cleanSpecs['Material'] = prod.material;
    if (prod.craft_type) cleanSpecs['Craft Technique'] = prod.craft_type;
    if (prod.category) cleanSpecs['Category'] = prod.category;
  }

  return {
    id: prod.id,
    artisan_id: prod.artisan_id || 'artisan-default',
    artisan_name: artisanName,
    artisan_location: artisanLocation,
    name: displayName,
    category: prod.category || 'Handicrafts',
    subcategory: prod.subcategory || null,
    material: prod.material || null,
    craft_type: prod.craft_type || null,
    price: prod.price || 0,
    stock_quantity: prod.stock_quantity || 0,
    is_in_stock: (prod.stock_quantity || 0) > 0,
    primary_image_url: prod.primary_image_url || prod.original_image_url || null,
    short_description: shortDesc,
    full_description: fullDesc,
    highlights: cleanHighlights,
    specifications: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : { Material: prod.material || 'Artisan grade', Category: prod.category || 'Handicraft' },
    craft_information: catalogue?.description || '',
    care_instructions: catalogue?.care_instructions || '',
    available_languages: ['en', 'ta', 'hi'],
    mrp: genuineMrp(prod),
    attributes: cleanAttributes(prod.attributes),
    created_at: prod.created_at || new Date().toISOString(),
  };
}
