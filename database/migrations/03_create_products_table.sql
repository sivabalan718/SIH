-- M63 Phase 2: Products Table
-- Run this migration in Supabase SQL Editor after Phase 1 migrations

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id      UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    category        VARCHAR(50),
    subcategory     VARCHAR(50),
    material        VARCHAR(100),
    color           VARCHAR(100),
    craft_type      VARCHAR(100),
    features        TEXT[] DEFAULT '{}',
    price           NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    creation_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
                    CHECK (creation_source IN ('MANUAL', 'AI_ASSISTED')),
    primary_image_url   TEXT,
    original_image_url  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON public.products(artisan_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_artisan_status ON public.products(artisan_id, status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- Auto-update updated_at timestamp trigger (reuses function from migration 01)
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
