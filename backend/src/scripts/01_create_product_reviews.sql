-- Migration: Create Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  artisan_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  customer_name TEXT DEFAULT 'Verified Customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_artisan_id ON product_reviews(artisan_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON product_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON product_reviews(order_id);

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Public read access for verified product reviews
CREATE POLICY "Public read product_reviews" ON product_reviews
  FOR SELECT USING (true);

-- Customers can insert reviews for their own order items
CREATE POLICY "Customer insert product_reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid()::text = customer_id);
