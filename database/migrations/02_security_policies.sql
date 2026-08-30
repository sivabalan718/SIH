-- Enable Row Level Security
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by Node.js backend)
DROP POLICY IF EXISTS "Service Role full access on artisans" ON public.artisans;
CREATE POLICY "Service Role full access on artisans"
ON public.artisans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated artisans can view their own profile
DROP POLICY IF EXISTS "Artisans can view own profile" ON public.artisans;
CREATE POLICY "Artisans can view own profile"
ON public.artisans
FOR SELECT
TO authenticated
USING (auth.uid() = supabase_user_id);
