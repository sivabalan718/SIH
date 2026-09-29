import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { fetchMarketplaceProducts, MarketplaceFilterQuery, MarketplaceProductItem } from '../../services/marketplaceService.js';
import { ProductCardSkeleton, ShopProductCard } from '../../components/shop/ShopProductCard.js';
import { facetBy, useCatalogIndex } from '../../components/shop/useCatalogIndex.js';
import { getShopLang, useShopStore } from '../../utils/shopStore.js';
import { translateCategoryName } from '../../utils/marketplaceI18n.js';

const PAGE_SIZE = 24;
const PRICE_BANDS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under ₹500', max: 500 },
  { label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 – ₹2,500', min: 1000, max: 2500 },
  { label: 'Above ₹2,500', min: 2500 },
];
const SORTS: Array<{ value: NonNullable<MarketplaceFilterQuery['sort']>; label: string }> = [
  { value: 'recommended', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const ShopDiscover: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const lang = useShopStore(getShopLang);
  const { products: index } = useCatalogIndex(lang);

  const q = params.get('q') || '';
  const cat = params.get('cat') || '';
  const artisan = params.get('artisan') || '';
  const artisanName = params.get('artisanName') || '';
  const material = params.get('material') || '';
  const craft = params.get('craft') || '';
  const min = Number(params.get('min')) || undefined;
  const max = Number(params.get('max')) || undefined;
  const sort = (params.get('sort') as MarketplaceFilterQuery['sort']) || 'recommended';
  const inStockOnly = params.get('stock') === '1';

  const [items, setItems] = useState<MarketplaceProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filter: MarketplaceFilterQuery = { search: q, category: cat, artisan_id: artisan, material, craft_type: craft, min_price: min, max_price: max, sort, lang };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMarketplaceProducts({ ...filter, limit: PAGE_SIZE, offset: 0 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.products);
        setTotal(res.total);
      })
      .catch(() => !cancelled && setError('Could not load products. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params.toString(), lang]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchMarketplaceProducts({ ...filter, limit: PAGE_SIZE, offset: items.length });
      setItems((prev) => [...prev, ...res.products.filter((p) => !prev.some((x) => x.id === p.id))]);
      setTotal(res.total);
    } catch {
      setError('Could not load more products.');
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const categories = useMemo(() => facetBy(index, 'category'), [index]);
  const scoped = useMemo(() => (cat ? index.filter((p) => p.category === cat) : index), [index, cat]);
  const materials = useMemo(() => facetBy(scoped, 'material').slice(0, 12), [scoped]);
  const crafts = useMemo(() => facetBy(scoped, 'craft_type').slice(0, 12), [scoped]);
  const visible = inStockOnly ? items.filter((p) => p.stock_quantity > 0) : items;
  const activePrice = PRICE_BANDS.find((b) => b.min === min && b.max === max);
  const activeFilters = [material, craft, activePrice?.label, inStockOnly ? 'In stock' : ''].filter(Boolean).length;

  const title = q ? `“${q}”` : artisanName ? `By ${artisanName}` : cat ? translateCategoryName(cat, lang) : 'All products';

  return (
    <div className="disc">
      <nav className="disc__rail" aria-label="Browse categories">
        <button className="disc__cat" aria-pressed={!cat} onClick={() => update({ cat: undefined, material: undefined, craft: undefined })}>
          All<span>{index.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.value} className="disc__cat" aria-pressed={cat === c.value} onClick={() => update({ cat: c.value, material: undefined, craft: undefined })}>
            {translateCategoryName(c.value, lang)}
            <span>{c.count}</span>
          </button>
        ))}
      </nav>

      <div className="disc__body">
        <div className="disc__bar">
          <div className="disc__count">
            <strong style={{ color: 'var(--shop-ink)', display: 'block', fontSize: '0.98rem' }}>{title}</strong>
            {loading ? 'Searching…' : `${inStockOnly ? visible.length : total} result${total === 1 ? '' : 's'}`}
          </div>
          <button className="shop-chip" aria-pressed={activeFilters > 0} onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal size={15} /> Filters{activeFilters ? ` · ${activeFilters}` : ''}
          </button>
        </div>

        {(q || artisan) && (
          <div className="shop-chips" style={{ paddingTop: 0 }}>
            {q && (
              <button className="shop-chip" onClick={() => update({ q: undefined })}>
                Search: {q} <X size={14} />
              </button>
            )}
            {artisan && (
              <button className="shop-chip" onClick={() => update({ artisan: undefined, artisanName: undefined })}>
                Artisan: {artisanName || 'selected'} <X size={14} />
              </button>
            )}
          </div>
        )}

        {crafts.length > 1 && (
          <div className="shop-chips" style={{ paddingTop: 0 }} aria-label="Craft technique">
            {crafts.map((c) => (
              <button key={c.value} className="shop-chip" aria-pressed={craft === c.value} onClick={() => update({ craft: craft === c.value ? undefined : c.value })}>
                {c.value}
              </button>
            ))}
          </div>
        )}

        {error && <div className="shop-empty">{error}</div>}

        <div className="shop-grid" style={{ marginTop: 6 }}>
          {loading ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />) : visible.map((p) => <ShopProductCard key={p.id} product={p} lang={lang} />)}
        </div>

        {!loading && !error && visible.length === 0 && (
          <div className="shop-empty">
            <h3>No matching products</h3>
            <p>Try a different search or clear some filters.</p>
            <button className="shop-btn shop-btn--dark" style={{ marginTop: 12 }} onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear all
            </button>
          </div>
        )}

        {!loading && items.length < total && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <button className="shop-btn shop-btn--ghost" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {sheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Filter and sort">
            <div className="sheet__grip" />
            <h3>Filter & sort</h3>
            <div className="sheet__group">
              <div className="sheet__label">Sort by</div>
              <div className="sheet__opts">
                {SORTS.map((s) => (
                  <button key={s.value} className="shop-chip" aria-pressed={sort === s.value} onClick={() => update({ sort: s.value === 'recommended' ? undefined : s.value })}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sheet__group">
              <div className="sheet__label">Price</div>
              <div className="sheet__opts">
                {PRICE_BANDS.map((b) => {
                  const on = activePrice === b;
                  return (
                    <button key={b.label} className="shop-chip" aria-pressed={on} onClick={() => update(on ? { min: undefined, max: undefined } : { min: b.min ? String(b.min) : undefined, max: b.max ? String(b.max) : undefined })}>
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {materials.length > 0 && (
              <div className="sheet__group">
                <div className="sheet__label">Material</div>
                <div className="sheet__opts">
                  {materials.map((m) => (
                    <button key={m.value} className="shop-chip" aria-pressed={material === m.value} onClick={() => update({ material: material === m.value ? undefined : m.value })}>
                      {m.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {crafts.length > 0 && (
              <div className="sheet__group">
                <div className="sheet__label">Craft technique</div>
                <div className="sheet__opts">
                  {crafts.map((c) => (
                    <button key={c.value} className="shop-chip" aria-pressed={craft === c.value} onClick={() => update({ craft: craft === c.value ? undefined : c.value })}>
                      {c.value}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="sheet__group">
              <div className="sheet__label">Availability</div>
              <button className="shop-chip" aria-pressed={inStockOnly} onClick={() => update({ stock: inStockOnly ? undefined : '1' })}>
                In stock only
              </button>
            </div>
            <div className="sheet__actions">
              <button className="shop-btn shop-btn--ghost" onClick={() => update({ material: undefined, craft: undefined, min: undefined, max: undefined, stock: undefined, sort: undefined })}>
                Reset
              </button>
              <button className="shop-btn shop-btn--dark" onClick={() => setSheetOpen(false)}>
                Show {inStockOnly ? visible.length : total} results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
