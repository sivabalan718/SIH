-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create artisans table
CREATE TABLE IF NOT EXISTS public.artisans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    m63_id VARCHAR(12) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'ARTISAN' CHECK (role IN ('ARTISAN', 'ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast M63 ID lookups during login
CREATE INDEX IF NOT EXISTS idx_artisans_m63_id ON public.artisans(m63_id);
CREATE INDEX IF NOT EXISTS idx_artisans_email ON public.artisans(LOWER(email));

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_artisans_updated_at ON public.artisans;
CREATE TRIGGER update_artisans_updated_at
BEFORE UPDATE ON public.artisans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
