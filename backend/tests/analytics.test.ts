import { describe, it, expect } from '@jest/globals';
import { getArtisanAnalytics } from '../src/services/analytics.service.js';
import { generateBusinessInsights } from '../src/services/ai/business-intelligence.service.js';
import { createProduct, publishProduct } from '../src/services/product.service.js';
import { createOrder } from '../src/services/order.service.js';

describe('M63 Phase 8 — Business Intelligence & Analytics Tests', () => {
  jest.setTimeout(25000);

  it('should calculate revenue, orders, units sold, and AOV deterministically from orders', async () => {
    const artisanA = 'artisan-analytics-111';
    const buyerA = 'buyer-analytics-111';

    const p1 = await createProduct(artisanA, {
      name: 'Analytics Kanchipuram Silk Saree',
      description: 'Handcrafted traditional silk saree with gold zari work.',
      price: 2500,
      stock_quantity: 10,
      category: 'Textiles',
    });
    (p1 as any).primary_image_url = 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb';
    await publishProduct(p1.id, artisanA);

    const p2 = await createProduct(artisanA, {
      name: 'Analytics Clay Diya Set',
      description: 'Terracotta handpainted clay diya set for festive lighting.',
      price: 500,
      stock_quantity: 4, // low stock <= 5
      category: 'Pottery',
    });
    (p2 as any).primary_image_url = 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb';
    await publishProduct(p2.id, artisanA);

    // Place Order for 2 units of p1 and 1 unit of p2 (Total = 2500*2 + 500 = ₹5500)
    await createOrder(
      buyerA,
      { name: 'Buyer A', phone: '9876543210', address: '123 Test St' },
      [
        { product_id: p1.id, quantity: 2 },
        { product_id: p2.id, quantity: 1 },
      ]
    );

    const analytics = await getArtisanAnalytics(artisanA, '30d');

    expect(analytics.has_data).toBe(true);
    expect(analytics.kpis.total_revenue).toBe(5500);
    expect(analytics.kpis.total_orders).toBe(1);
    expect(analytics.kpis.units_sold).toBe(3);
    expect(analytics.kpis.average_order_value).toBe(5500);
    expect(analytics.kpis.active_products).toBeGreaterThanOrEqual(2);

    // Product Ranking
    expect(analytics.product_performance[0].id).toBe(p1.id);
    expect(analytics.product_performance[0].revenue).toBe(5000);
    expect(analytics.product_performance[0].units_sold).toBe(2);

    // Category Breakdown
    const textilesCat = analytics.category_performance.find((c) => c.category === 'Textiles');
    expect(textilesCat).toBeDefined();
    expect(textilesCat?.revenue).toBe(5000);
  });

  it('should enforce strict artisan data isolation (Artisan A cannot see Artisan B data)', async () => {
    const artisanA = 'artisan-iso-aaaa';
    const artisanB = 'artisan-iso-bbbb';
    const buyer = 'buyer-iso-111';

    const prodA = await createProduct(artisanA, {
      name: 'Artisan A Wooden Toy',
      description: 'Handcrafted wooden toy made with natural organic vegetable dyes.',
      price: 1000,
      stock_quantity: 10,
      category: 'Wood Craft',
    });
    (prodA as any).primary_image_url = 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb';
    await publishProduct(prodA.id, artisanA);

    const prodB = await createProduct(artisanB, {
      name: 'Artisan B Silver Necklace',
      description: 'Traditional silver necklace handcrafted by artisan B.',
      price: 9000,
      stock_quantity: 5,
      category: 'Jewellery',
    });
    (prodB as any).primary_image_url = 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb';
    await publishProduct(prodB.id, artisanB);

    // Order prodA
    await createOrder(buyer, { name: 'Buyer', phone: '123', address: 'Addr' }, [{ product_id: prodA.id, quantity: 1 }]);

    const analyticsA = await getArtisanAnalytics(artisanA, '30d');
    const analyticsB = await getArtisanAnalytics(artisanB, '30d');

    // Artisan A should see ₹1000 revenue
    expect(analyticsA.kpis.total_revenue).toBe(1000);
    expect(analyticsA.product_performance.some((p) => p.id === prodA.id)).toBe(true);
    expect(analyticsA.product_performance.some((p) => p.id === prodB.id)).toBe(false);

    // Artisan B should see ₹0 revenue (none of B's products were ordered)
    expect(analyticsB.kpis.total_revenue).toBe(0);
    expect(analyticsB.product_performance.some((p) => p.id === prodB.id)).toBe(true);
    expect(analyticsB.product_performance.some((p) => p.id === prodA.id)).toBe(false);
  });

  it('should generate structured business insights with trust_level and evidence metrics', async () => {
    const artisanA = 'artisan-analytics-111';
    const analytics = await getArtisanAnalytics(artisanA, '30d');

    const insights = await generateBusinessInsights(analytics, 'en');

    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(0);

    const first = insights[0];
    expect(first.title).toBeDefined();
    expect(first.message).toBeDefined();
    expect(['VERIFIED', 'OBSERVED', 'INFERRED', 'UNAVAILABLE']).toContain(first.trust_level);
    expect(Array.isArray(first.evidence)).toBe(true);
    expect(first.evidence.length).toBeGreaterThan(0);
  });

  it('should handle new artisan with zero sales cleanly without errors', async () => {
    const newArtisan = 'new-artisan-empty-123';
    const analytics = await getArtisanAnalytics(newArtisan, '30d');
    const insights = await generateBusinessInsights(analytics, 'en');

    expect(analytics.kpis.total_revenue).toBe(0);
    expect(analytics.kpis.total_orders).toBe(0);
    expect(analytics.kpis.units_sold).toBe(0);
    expect(analytics.kpis.average_order_value).toBe(0);

    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].trust_level).toBe('VERIFIED');
  });
});
