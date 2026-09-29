import { useEffect, useState } from 'react';
import { fetchMarketplaceProducts, MarketplaceProductItem } from '../../services/marketplaceService.js';
import { SupportedLang } from '../../utils/marketplaceI18n.js';

/**
 * Session-cached index of published marketplace products. Powers category/material/craft facets,
 * recently viewed, wishlist, recommendations and M63 AI — all derived from real catalogue data.
 */
const cache = new Map<SupportedLang, { at: number; products: MarketplaceProductItem[] }>();
const inflight = new Map<SupportedLang, Promise<MarketplaceProductItem[]>>();
const TTL_MS = 60_000;

export function loadCatalogIndex(lang: SupportedLang): Promise<MarketplaceProductItem[]> {
  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.products);
  if (!inflight.has(lang)) {
    inflight.set(
      lang,
      fetchMarketplaceProducts({ limit: 100, sort: 'newest', lang })
        .then((res) => {
          cache.set(lang, { at: Date.now(), products: res.products });
          return res.products;
        })
        .finally(() => inflight.delete(lang))
    );
  }
  return inflight.get(lang)!;
}

export function useCatalogIndex(lang: SupportedLang) {
  const [products, setProducts] = useState<MarketplaceProductItem[]>(() => cache.get(lang)?.products || []);
  const [loading, setLoading] = useState(!cache.has(lang));
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    loadCatalogIndex(lang)
      .then(setProducts)
      .catch(() => setError('We could not load the marketplace. Check your connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [lang]);
  return { products, loading, error, reload: load };
}

export interface Facet {
  value: string;
  count: number;
  image?: string | null;
}

export function facetBy(products: MarketplaceProductItem[], key: 'category' | 'material' | 'craft_type'): Facet[] {
  const map = new Map<string, Facet>();
  for (const p of products) {
    const value = (p[key] || '').trim();
    if (!value) continue;
    const f = map.get(value) || { value, count: 0, image: p.primary_image_url };
    f.count++;
    if (!f.image && p.primary_image_url) f.image = p.primary_image_url;
    map.set(value, f);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/** Content-based similarity from Smart Catalogue attributes (category, craft, material, price band). */
export function similarityScore(a: MarketplaceProductItem, b: MarketplaceProductItem): number {
  if (a.id === b.id) return -1;
  let score = 0;
  if (a.category === b.category) score += 3;
  if (a.craft_type && a.craft_type === b.craft_type) score += 2;
  if (a.material && b.material && a.material.toLowerCase() === b.material.toLowerCase()) score += 2;
  const ratio = Math.min(a.price, b.price) / Math.max(a.price, b.price || 1);
  if (ratio > 0.6) score += 1;
  return score;
}

export function rankSimilar(seed: MarketplaceProductItem[], pool: MarketplaceProductItem[], limit = 10, minScore = 3) {
  const seedIds = new Set(seed.map((s) => s.id));
  return pool
    .filter((p) => !seedIds.has(p.id))
    .map((p) => ({ p, s: Math.max(...seed.map((x) => similarityScore(x, p))) }))
    .filter((x) => x.s >= minScore)
    .sort((a, b) => b.s - a.s || b.p.stock_quantity - a.p.stock_quantity)
    .slice(0, limit)
    .map((x) => x.p);
}
