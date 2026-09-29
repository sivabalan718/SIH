-- ============================================================================
-- M63 Migration 07 — Commerce, payments, reviews, customers, pricing
-- Run once in Supabase → SQL Editor. Safe to re-run (IF NOT EXISTS everywhere).
-- Non-destructive: creates missing tables / adds missing columns only.
--
-- Why: the backend already reads/writes these tables, but they were never created,
-- so carts, orders and customers silently fell back to in-memory storage (lost on
-- restart) and reviews could not be saved at all.
-- ============================================================================

-- Shared updated_at trigger function (created in migration 01; recreated defensively)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Customer profiles (id = Supabase auth user id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  mobile             TEXT,
  address            TEXT,
  locality           TEXT,
  city               TEXT,
  district           TEXT,
  state              TEXT,
  postal_code        TEXT,
  country            TEXT NOT NULL DEFAULT 'India',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ta', 'hi')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles (LOWER(email));

DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. Cart items (buyer_id = auth user id, or a guest id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cart_items_buyer_product UNIQUE (buyer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_buyer ON public.cart_items (buyer_id);

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. Orders (one order per artisan per checkout; id format 'ord-...')
--    Includes Razorpay payment state (server-verified only).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                   TEXT PRIMARY KEY,
  m63_order_number     TEXT NOT NULL,
  buyer_id             TEXT NOT NULL,
  artisan_id           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  subtotal             NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_charge      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  total_amount         NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  shipping_name        TEXT NOT NULL,
  shipping_phone       TEXT NOT NULL,
  shipping_address     TEXT NOT NULL,
  placed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at         TIMESTAMPTZ,
  processing_at        TIMESTAMPTZ,
  shipped_at           TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ
);

-- Payment columns (added separately so this also upgrades an existing orders table)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_group_id TEXT;      -- orders created in one checkout share this
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_payment_status') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_payment_status
      CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders (buyer_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_artisan ON public.orders (artisan_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_group ON public.orders (checkout_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order ON public.orders (razorpay_order_id);
-- A Razorpay payment can settle orders only once
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_payment_per_order
  ON public.orders (id, razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Order items (price snapshots at purchase time)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id             TEXT NOT NULL,
  product_name_snapshot  TEXT NOT NULL,
  unit_price_snapshot    NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity               INTEGER NOT NULL CHECK (quantity > 0),
  subtotal               NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  artisan_id             TEXT NOT NULL,
  primary_image_url      TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- ----------------------------------------------------------------------------
-- 5. Product reviews (verified purchases only; optional customer photos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id  TEXT NOT NULL UNIQUE,
  order_id       TEXT NOT NULL,
  product_id     TEXT NOT NULL,
  customer_id    TEXT NOT NULL,
  artisan_id     TEXT NOT NULL,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text    TEXT,
  customer_name  TEXT DEFAULT 'Verified Customer',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_artisan ON public.product_reviews (artisan_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.product_reviews (customer_id);

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. Smart Fair Pricing records (one per product)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_pricing_intelligence (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             TEXT NOT NULL UNIQUE,
  artisan_id             TEXT NOT NULL,
  material_cost          NUMERIC(12, 2),
  labour_cost            NUMERIC(12, 2),
  other_expenses         NUMERIC(12, 2),
  production_time        NUMERIC(10, 2),
  production_time_unit   TEXT DEFAULT 'days',
  known_cost             NUMERIC(12, 2),
  fair_price_min         NUMERIC(12, 2),
  fair_price_max         NUMERIC(12, 2),
  suggested_price        NUMERIC(12, 2),
  confidence             TEXT DEFAULT 'medium',
  factors                JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation            TEXT DEFAULT '',
  missing_information    JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions            JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation_status  TEXT DEFAULT 'none',
  active_language        TEXT DEFAULT 'en',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pricing_artisan ON public.product_pricing_intelligence (artisan_id);

-- ----------------------------------------------------------------------------
-- 7. Products: marketplace-ready structured data (used in later steps)
--    mrp        → genuine "was" price set by the artisan (discount shown only if mrp > price)
--    attributes → category-aware Smart Catalogue fields (dimensions, capacity, set size,
--                 finish, customization, care, ...), never invented
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mrp NUMERIC(12, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_mrp') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_mrp CHECK (mrp IS NULL OR mrp >= price);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security
--    The M63 backend uses the service-role key (bypasses RLS) and enforces
--    ownership itself. Direct anon/browser access stays locked down, except
--    public read of reviews.
-- ----------------------------------------------------------------------------
ALTER TABLE public.customer_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers read own profile" ON public.customer_profiles;
CREATE POLICY "Customers read own profile" ON public.customer_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Buyers read own orders" ON public.orders;
CREATE POLICY "Buyers read own orders" ON public.orders
  FOR SELECT USING (auth.uid()::text = buyer_id);

DROP POLICY IF EXISTS "Public read product_reviews" ON public.product_reviews;
CREATE POLICY "Public read product_reviews" ON public.product_reviews
  FOR SELECT USING (true);

-- Refresh PostgREST schema cache so the API sees the new tables immediately
NOTIFY pgrst, 'reload schema';
