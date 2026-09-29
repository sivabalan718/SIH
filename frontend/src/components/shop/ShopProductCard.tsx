import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Star } from 'lucide-react';
import { MarketplaceProductItem } from '../../services/marketplaceService.js';
import { addToBuyerCart } from '../../services/cartService.js';
import { handleProductImageError } from '../../utils/imageFallback.js';
import { formatINR, getWishlist, notifyCartUpdated, showToast, toggleWishlist, useShopStore } from '../../utils/shopStore.js';
import { SupportedLang, translateProductName } from '../../utils/marketplaceI18n.js';

export const StockLabel: React.FC<{ stock: number }> = ({ stock }) => {
  if (stock <= 0) return <span className="pcard__stock pcard__stock--out">Out of stock</span>;
  if (stock <= 5) return <span className="pcard__stock pcard__stock--low">Only {stock} left</span>;
  return <span className="pcard__stock">In stock</span>;
};

/** Price with a genuine discount only when the artisan set an M.R.P. above the selling price. */
export const PriceTag: React.FC<{ price: number; mrp?: number | null; size?: 'md' | 'lg' }> = ({ price, mrp, size = 'md' }) => {
  const off = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <div className={`price${size === 'lg' ? ' price--lg' : ''}`}>
      {off > 0 && <span className="price__off">-{off}%</span>}
      <span className="price__now">{formatINR(price)}</span>
      {off > 0 && (
        <span className="price__mrp">
          M.R.P.<s>{formatINR(mrp!)}</s>
        </span>
      )}
    </div>
  );
};

export const RatingInline: React.FC<{ average?: number; count?: number }> = ({ average, count }) =>
  count && count > 0 && average ? (
    <span className="stars" aria-label={`Rated ${average.toFixed(1)} out of 5 from ${count} reviews`}>
      <Star size={12} fill="#d97706" color="#d97706" />
      <b>{average.toFixed(1)}</b>({count})
    </span>
  ) : null;

export const ShopProductCard: React.FC<{ product: MarketplaceProductItem; lang?: SupportedLang }> = ({ product, lang = 'en' }) => {
  const navigate = useNavigate();
  const wishlist = useShopStore(getWishlist);
  const saved = wishlist.includes(product.id);
  const [adding, setAdding] = useState(false);
  const out = product.stock_quantity <= 0;

  const add = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (out || adding) return;
    setAdding(true);
    try {
      const cart = await addToBuyerCart(product.id, 1);
      notifyCartUpdated(cart.items.reduce((n, i) => n + i.quantity, 0));
      showToast('Added to cart');
    } catch (err: any) {
      showToast(err?.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className="pcard"
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/marketplace/product/${product.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/marketplace/product/${product.id}`)}
    >
      <div className="pcard__media">
        <img
          src={product.primary_image_url || ''}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(e) => handleProductImageError(e, product.category)}
        />
        <button
          className="pcard__save"
          aria-pressed={saved}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={(e) => {
            e.stopPropagation();
            showToast(toggleWishlist(product.id) ? 'Saved to wishlist' : 'Removed from wishlist');
          }}
        >
          <Heart size={17} fill={saved ? '#dc2626' : 'none'} />
        </button>
        {product.craft_type && <span className="pcard__flag">{product.craft_type}</span>}
      </div>
      <div className="pcard__body">
        <span className="pcard__artisan">by {product.artisan_name}</span>
        <h3 className="pcard__name">{translateProductName(product.name, lang)}</h3>
        <RatingInline average={product.rating_average} count={product.review_count} />
        {product.material && <span className="pcard__meta">{product.material}</span>}
        <StockLabel stock={product.stock_quantity} />
        <div className="pcard__row">
          <span className="pcard__price">
            <PriceTag price={product.price} mrp={product.mrp} />
          </span>
          <button className="pcard__add" onClick={add} disabled={out || adding} aria-label={`Add ${product.name} to cart`}>
            <Plus size={18} />
          </button>
        </div>
      </div>
    </article>
  );
};

export const ProductCardSkeleton: React.FC = () => (
  <div className="pcard" aria-hidden>
    <div className="pcard__media skel" style={{ borderRadius: 0 }} />
    <div className="pcard__body">
      <div className="skel" style={{ height: 10, width: '50%' }} />
      <div className="skel" style={{ height: 14, width: '90%' }} />
      <div className="skel" style={{ height: 14, width: '70%' }} />
      <div className="skel" style={{ height: 18, width: '40%', marginTop: 8 }} />
    </div>
  </div>
);

export const ProductRail: React.FC<{
  title: string;
  subtitle?: string;
  products: MarketplaceProductItem[];
  loading?: boolean;
  lang?: SupportedLang;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, subtitle, products, loading, lang, actionLabel, onAction }) => {
  if (!loading && products.length === 0) return null;
  return (
    <section className="shop-section" aria-label={title}>
      <div className="shop-section__head">
        <div>
          <h2 className="shop-section__title">{title}</h2>
          {subtitle && <p className="shop-section__sub">{subtitle}</p>}
        </div>
        {actionLabel && onAction && (
          <button className="shop-link" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      <div className="shop-rail">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
          : products.map((p) => <ShopProductCard key={p.id} product={p} lang={lang} />)}
      </div>
    </section>
  );
};
