-- ============================================================================
-- M63 Migration 08 — Wishlist, notifications, refund/replacement requests
-- Run once in Supabase → SQL Editor after migration 07. Safe to re-run.
-- Non-destructive: only creates missing tables/indexes/policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Wishlist saved to the customer account (was per-device only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wishlists_buyer_product UNIQUE (buyer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_buyer ON public.wishlists (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON public.wishlists (product_id);

-- ----------------------------------------------------------------------------
-- 2. In-app notifications (customers: auth user id; artisans: artisans.id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    TEXT NOT NULL,
  recipient_role  TEXT NOT NULL CHECK (recipient_role IN ('CUSTOMER', 'ARTISAN')),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL DEFAULT '',
  link            TEXT,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key      TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (recipient_id) WHERE read_at IS NULL;
-- The same event is never delivered twice to the same person
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe ON public.notifications (recipient_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id        TEXT PRIMARY KEY,
  order_updates  BOOLEAN NOT NULL DEFAULT TRUE,
  new_products   BOOLEAN NOT NULL DEFAULT TRUE,
  offers         BOOLEAN NOT NULL DEFAULT TRUE,
  sms            BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Refund / replacement requests after delivery
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id       TEXT NOT NULL,
  artisan_id     TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('REFUND', 'REPLACEMENT')),
  reason         TEXT NOT NULL,
  details        TEXT,
  photo_urls     TEXT[] NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED')),
  artisan_note   TEXT,
  refund_id      TEXT,
  refund_amount  NUMERIC(12, 2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_order_requests_buyer ON public.order_requests (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_requests_artisan ON public.order_requests (artisan_id, created_at DESC);
-- At most one open request per order
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_requests_open ON public.order_requests (order_id) WHERE status IN ('REQUESTED', 'APPROVED');

DROP TRIGGER IF EXISTS trg_order_requests_updated_at ON public.order_requests;
CREATE TRIGGER trg_order_requests_updated_at BEFORE UPDATE ON public.order_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security — backend (service role) enforces ownership;
--    direct browser access is limited to the signed-in user's own rows.
-- ----------------------------------------------------------------------------
ALTER TABLE public.wishlists                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_requests           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own wishlist" ON public.wishlists;
CREATE POLICY "Own wishlist" ON public.wishlists FOR SELECT USING (auth.uid()::text = buyer_id);

DROP POLICY IF EXISTS "Own notifications" ON public.notifications;
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT USING (auth.uid()::text = recipient_id);

DROP POLICY IF EXISTS "Own requests" ON public.order_requests;
CREATE POLICY "Own requests" ON public.order_requests FOR SELECT USING (auth.uid()::text = buyer_id);

NOTIFY pgrst, 'reload schema';
