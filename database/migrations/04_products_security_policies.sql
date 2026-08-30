-- M63 Phase 2: Products Security Policies
-- Run after 03_create_products_table.sql

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by Node.js backend)
DROP POLICY IF EXISTS "Service Role full access on products" ON public.products;
CREATE POLICY "Service Role full access on products"
ON public.products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated artisans can view their own products
DROP POLICY IF EXISTS "Artisans can view own products" ON public.products;
CREATE POLICY "Artisans can view own products"
ON public.products
FOR SELECT
TO authenticated
USING (
  artisan_id IN (
    SELECT id FROM public.artisans WHERE supabase_user_id = auth.uid()
  )
);
