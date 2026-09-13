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
}

export interface MarketplaceFilterQuery {
  search?: string;
  category?: string;
  craft_type?: string;
  material?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'newest';
  limit?: number;
  offset?: number;
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

  const limit = filter.limit || 50;
  const offset = filter.offset || 0;
  query = query.range(offset, offset + limit - 1);

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

  const combinedMap = new Map<string, any>();
  for (const p of [...dbList, ...memList]) {
    if (p && p.id && p.status === 'PUBLISHED') {
      combinedMap.set(p.id, p);
    }
  }

  let productsList: any[] = Array.from(combinedMap.values());

  // Batch-fetch all catalogues in a single database/memory pass
  const productIds = productsList.map((p) => p.id);
  const cataloguesMap = await getBatchCatalogueContent(productIds, language);

  const items: MarketplaceProductItem[] = productsList.map((prod) => {
    const catalogue = cataloguesMap.get(prod.id);

    const artisanInfo = prod.artisans || {};
    const artisanName = artisanInfo.name || 'Master Artisan';
    const locationParts = [artisanInfo.locality, artisanInfo.district, artisanInfo.state].filter(Boolean);
    const artisanLocation = locationParts.length > 0 ? locationParts.join(', ') : 'Tamil Nadu, India';

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
      created_at: prod.created_at || new Date().toISOString(),
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
  const artisanLocation = locationParts.length > 0 ? locationParts.join(', ') : 'Tamil Nadu, India';

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
    created_at: prod.created_at || new Date().toISOString(),
  };
}
