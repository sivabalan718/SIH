-- M63 Phase 8: Smart Catalogue Content Table
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.product_catalogue_content (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    artisan_id          UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
    language            VARCHAR(10) NOT NULL CHECK (language IN ('en', 'ta', 'hi')),
    title               TEXT NOT NULL,
    short_description   TEXT NOT NULL,
    description         TEXT NOT NULL,
    highlights          TEXT[] DEFAULT '{}',
    specifications      JSONB DEFAULT '{}'::jsonb,
    care_instructions   TEXT DEFAULT '',
    tags                TEXT[] DEFAULT '{}',
    tone_style          VARCHAR(30) DEFAULT 'PROFESSIONAL',
    generated_by        VARCHAR(20) DEFAULT 'm63' CHECK (generated_by IN ('m63', 'artisan')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_catalogue_lang UNIQUE (product_id, language)
);

-- Indexes for lightning-fast lookups and joins
CREATE INDEX IF NOT EXISTS idx_catalogue_product_id ON public.product_catalogue_content(product_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_artisan_id ON public.product_catalogue_content(artisan_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_product_lang ON public.product_catalogue_content(product_id, language);

-- Enable Row Level Security
ALTER TABLE public.product_catalogue_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access for published product marketplace cataloguing
DROP POLICY IF EXISTS "Public can view product catalogues" ON public.product_catalogue_content;
CREATE POLICY "Public can view product catalogues" 
ON public.product_catalogue_content 
FOR SELECT 
USING (true);

-- Allow artisans full control over catalogues belonging to their products
DROP POLICY IF EXISTS "Artisans can manage their own product catalogues" ON public.product_catalogue_content;
CREATE POLICY "Artisans can manage their own product catalogues" 
ON public.product_catalogue_content 
FOR ALL 
TO authenticated 
USING (auth.uid() = artisan_id)
WITH CHECK (auth.uid() = artisan_id);

-- Auto-update updated_at timestamp trigger
DROP TRIGGER IF EXISTS update_product_catalogue_updated_at ON public.product_catalogue_content;
CREATE TRIGGER update_product_catalogue_updated_at
BEFORE UPDATE ON public.product_catalogue_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
