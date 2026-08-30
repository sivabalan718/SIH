import { apiRequest } from './api.js';

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
  lang?: 'en' | 'ta' | 'hi';
}

export async function fetchMarketplaceProducts(
  filter: MarketplaceFilterQuery = {}
): Promise<{ products: MarketplaceProductItem[]; total: number }> {
  const params = new URLSearchParams();
  if (filter.search) params.append('search', filter.search);
  if (filter.category) params.append('category', filter.category);
  if (filter.craft_type) params.append('craft_type', filter.craft_type);
  if (filter.material) params.append('material', filter.material);
  if (filter.min_price) params.append('min_price', String(filter.min_price));
  if (filter.max_price) params.append('max_price', String(filter.max_price));
  if (filter.sort) params.append('sort', filter.sort);
  if (filter.limit) params.append('limit', String(filter.limit));
  if (filter.offset) params.append('offset', String(filter.offset));
  if (filter.lang) params.append('lang', filter.lang);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiRequest<{ products: MarketplaceProductItem[]; total: number }>(
    `/marketplace/products${queryString}`,
    { method: 'GET' }
  );
  return res;
}

export async function fetchMarketplaceProductById(
  id: string,
  lang: 'en' | 'ta' | 'hi' = 'en'
): Promise<MarketplaceProductItem> {
  const res = await apiRequest<{ product: MarketplaceProductItem }>(
    `/marketplace/products/${id}?lang=${lang}`,
    { method: 'GET' }
  );
  return res.product;
}
