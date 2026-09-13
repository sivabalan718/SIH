-- M63 Phase 7: Add Enhanced Image & Background Tracking to Products
-- Run this migration in Supabase SQL Editor

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS enhanced_image_url TEXT,
ADD COLUMN IF NOT EXISTS selected_background VARCHAR(50),
ADD COLUMN IF NOT EXISTS enhanced_at TIMESTAMPTZ;

-- Index for querying enhanced products
CREATE INDEX IF NOT EXISTS idx_products_enhanced_image ON public.products(enhanced_image_url) 
WHERE enhanced_image_url IS NOT NULL;
