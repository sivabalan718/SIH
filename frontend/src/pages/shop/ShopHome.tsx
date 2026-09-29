import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { PriceTag, ProductCardSkeleton, ProductRail, ShopProductCard } from '../../components/shop/ShopProductCard.js';
import { facetBy, rankSimilar, useCatalogIndex } from '../../components/shop/useCatalogIndex.js';
import { getRecentlyViewed, getShopLang, getWishlist, useShopStore } from '../../utils/shopStore.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { translateCategoryName } from '../../utils/marketplaceI18n.js';

const PAGE = 12;

export const ShopHome: React.FC = () => {
  const navigate = useNavigate();
  const lang = useShopStore(getShopLang);
  const recentIds = useShopStore(getRecentlyViewed);
  const wishlistIds = useShopStore(getWishlist);
  const { products, loading, error, reload } = useCatalogIndex(lang);
  const [visible, setVisible] = useState(PAGE);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(() => facetBy(products, 'category'), [products]);
  const recent = useMemo(() => recentIds.map((id) => byId.get(id)).filter(Boolean) as typeof products, [recentIds, byId]);
  const recommended = useMemo(() => {
    const seed = [...recent.slice(0, 5), ...(wishlistIds.map((id) => byId.get(id)).filter(Boolean) as typeof products)];
    return seed.length ? rankSimilar(seed, products.filter((p) => p.stock_quantity > 0), 10) : [];
  }, [recent, wishlistIds, byId, products]);
  const newArrivals = products.slice(0, 10);
  const topRated = useMemo(
    () => products.filter((p) => (p.review_count || 0) > 0).sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0) || (b.review_count || 0) - (a.review_count || 0)).slice(0, 10),
    [products]
  );
  const budget = useMemo(() => products.filter((p) => p.price <= 500 && p.stock_quantity > 0).slice(0, 10), [products]);
  const artisans = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; crafts: Set<string>; image: string | null }>();
    for (const p of products) {
      const a = map.get(p.artisan_id) || { id: p.artisan_id, name: p.artisan_name, count: 0, crafts: new Set<string>(), image: p.primary_image_url };
      a.count++;
      if (p.craft_type) a.crafts.add(p.craft_type);
      map.set(p.artisan_id, a);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [products]);
  const hero = products.find((p) => p.primary_image_url);
  const offers = useMemo(
    () => products.filter((p) => p.mrp && p.mrp > p.price && p.stock_quantity > 0).sort((a, b) => (b.mrp! - b.price) / b.mrp! - (a.mrp! - a.price) / a.mrp!).slice(0, 10),
    [products]
  );
  const picks = recommended.length >= 4 ? recommended : topRated.length >= 4 ? topRated : products.filter((p) => p.stock_quantity > 0).slice(0, 4);

  if (error && products.length === 0) {
    return (
      <div className="shop-empty">
        <h3>Marketplace unavailable</h3>
        <p>{error}</p>
        <button className="shop-btn shop-btn--dark" style={{ marginTop: 14 }} onClick={reload}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Categories from real listings */}
      <nav className="shop-cats" aria-label="Categories">
        {loading && categories.length === 0
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="shop-cat">
                <div className="shop-cat__img skel" />
                <div className="skel" style={{ height: 10, width: 50 }} />
              </div>
            ))
          : categories.map((c) => (
              <button key={c.value} className="shop-cat" onClick={() => navigate(`/marketplace/discover?cat=${encodeURIComponent(c.value)}`)}>
                <span className="shop-cat__img">
                  {c.image && <img src={c.image} alt="" loading="lazy" onError={(e) => handleProductImageError(e, c.value)} />}
                </span>
                {translateCategoryName(c.value, lang)}
              </button>
            ))}
      </nav>

      {hero && (
        <section className="shop-hero">
          <img src={hero.primary_image_url || ''} alt="" onError={(e) => handleProductImageError(e, hero.category)} />
          <div className="shop-hero__body">
            <span className="shop-hero__eyebrow">{products.length} handmade pieces · {new Set(products.map((p) => p.artisan_id)).size} artisans</span>
            <h1 className="shop-hero__title">Made by hand. Sold by the maker.</h1>
            <button className="shop-hero__cta" onClick={() => navigate('/marketplace/discover')}>
              Explore the collection <ArrowRight size={15} />
            </button>
          </div>
        </section>
      )}

      {picks.length >= 4 && (
        <section className="band" aria-label="Handpicked for you">
          <div className="band__head">
            <h2>{recommended.length >= 4 ? 'Handpicked for you' : 'Top picks from artisans'}</h2>
            <button aria-label="See more" onClick={() => navigate('/marketplace/discover')}>
              <ArrowRight size={22} />
            </button>
          </div>
          <div className="band__card">
            {picks.slice(0, 4).map((p) => (
              <button key={p.id} className="band__tile" onClick={() => navigate(`/marketplace/product/${p.id}`)}>
                <img src={p.primary_image_url || ''} alt="" loading="lazy" onError={(e) => handleProductImageError(e, p.category)} />
                <span>{p.name}</span>
                <PriceTag price={p.price} mrp={p.mrp} />
              </button>
            ))}
          </div>
        </section>
      )}

      <ProductRail title="Artisan offers" subtitle="Genuine reductions set by the makers" products={offers} lang={lang} />

      <ProductRail title="Continue where you left off" subtitle="Recently viewed on this device" products={recent.slice(0, 10)} lang={lang} />
      <ProductRail title="Recommended for you" subtitle="Similar craft, material and category to what you viewed" products={recommended} lang={lang} />
      <ProductRail
        title="New from artisans"
        products={newArrivals}
        loading={loading && products.length === 0}
        lang={lang}
        actionLabel="See all"
        onAction={() => navigate('/marketplace/discover?sort=newest')}
      />
      <ProductRail title="Loved by customers" subtitle="Highest rated from verified purchases" products={topRated} lang={lang} />
      <ProductRail
        title="Handmade under ₹500"
        products={budget}
        lang={lang}
        actionLabel="See all"
        onAction={() => navigate('/marketplace/discover?max=500&sort=price_asc')}
      />

      {artisans.length > 0 && (
        <section className="shop-section" aria-label="Meet the artisans">
          <div className="shop-section__head">
            <div>
              <h2 className="shop-section__title">Meet the artisans</h2>
              <p className="shop-section__sub">Shop directly from the people who make it</p>
            </div>
          </div>
          <div className="shop-rail" style={{ gridAutoColumns: 'minmax(220px, 70%)' }}>
            {artisans.map((a) => (
              <button
                key={a.id}
                className="pcard"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}
                onClick={() => navigate(`/marketplace/discover?artisan=${encodeURIComponent(a.id)}&artisanName=${encodeURIComponent(a.name)}`)}
              >
                <span className="artisan-card__avatar">{a.name.charAt(0).toUpperCase()}</span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem' }}>{a.name}</strong>
                  <span className="pcard__meta" style={{ display: 'block' }}>
                    {[...a.crafts].slice(0, 2).join(' · ') || 'Handmade crafts'}
                  </span>
                  <span className="shop-link">{a.count} product{a.count === 1 ? '' : 's'} →</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {categories.slice(0, 3).map((c) => (
        <ProductRail
          key={c.value}
          title={translateCategoryName(c.value, lang)}
          products={products.filter((p) => p.category === c.value).slice(0, 10)}
          lang={lang}
          actionLabel={`All ${c.count}`}
          onAction={() => navigate(`/marketplace/discover?cat=${encodeURIComponent(c.value)}`)}
        />
      ))}

      <section className="shop-section" aria-label="All products">
        <div className="shop-section__head">
          <h2 className="shop-section__title">All handmade products</h2>
        </div>
        <div className="shop-grid">
          {loading && products.length === 0
            ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)
            : products.slice(0, visible).map((p) => <ShopProductCard key={p.id} product={p} lang={lang} />)}
        </div>
        {visible < products.length && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button className="shop-btn shop-btn--ghost" onClick={() => setVisible((v) => v + PAGE)}>
              Show more products
            </button>
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="shop-empty">
            <h3>No products yet</h3>
            <p>Artisans haven’t published products yet. Please check back soon.</p>
          </div>
        )}
      </section>
    </div>
  );
};
