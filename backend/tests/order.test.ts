import { describe, it, expect, jest } from '@jest/globals';
import { getMarketplaceProducts, getMarketplaceProductById } from '../src/services/marketplace.service.js';
import { addItemToCart, getBuyerCart } from '../src/services/cart.service.js';
import { createOrder, updateOrderStatus, cancelOrder } from '../src/services/order.service.js';
import { createProduct, publishProduct, updateProduct } from '../src/services/product.service.js';

describe('M63 Phase 7 — Marketplace, Cart & Order Management Tests', () => {
  jest.setTimeout(20000);

  it('should list only published products in marketplace and hide drafts', async () => {
    const artisanId = '11111111-1111-4111-a111-111111111111';

    // Create a published product and a draft product
    const draftProd = await createProduct(artisanId, {
      name: 'Draft Pottery Bowl',
      description: 'Handcrafted traditional pottery bowl from Madurai.',
      price: 450,
      stock_quantity: 10,
      category: 'Pottery',
    });

    const pubProd = await createProduct(artisanId, {
      name: 'Published Silk Stole',
      description: 'Handcrafted traditional silk stole woven by master artisans.',
      price: 1200,
      stock_quantity: 5,
      category: 'Textiles',
    });
    await updateProduct(pubProd.id, artisanId, {
      primary_image_url: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb',
    } as any);

    await publishProduct(pubProd.id, artisanId);

    const mkt = await getMarketplaceProducts();
    const foundPub = mkt.products.find((p) => p.id === pubProd.id);
    const foundDraft = mkt.products.find((p) => p.id === draftProd.id);

    expect(foundPub).toBeDefined();
    expect(foundPub?.price).toBe(1200);
    expect(foundPub?.stock_quantity).toBe(5);

    expect(foundDraft).toBeUndefined();
  });

  it('should revalidate cart prices and validate stock limits', async () => {
    const artisanId = '22222222-2222-4222-a222-222222222222';
    const buyerId = '33333333-3333-4333-a333-333333333333';

    const prod = await createProduct(artisanId, {
      name: 'Handwoven Cotton Table Runner',
      description: 'Handwoven cotton table runner created by master weavers.',
      price: 800,
      stock_quantity: 3,
      category: 'Textiles',
    });
    await updateProduct(prod.id, artisanId, { primary_image_url: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb' } as any);
    await publishProduct(prod.id, artisanId);

    // Add 2 items to cart
    const cart = await addItemToCart(buyerId, prod.id, 2);
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].subtotal).toBe(1600);

    // Attempting to exceed stock (3 max) should fail
    await expect(addItemToCart(buyerId, prod.id, 2)).rejects.toThrow();
  });

  it('should create orders, snapshot unit prices, deduct stock, and handle status transitions', async () => {
    const artisanId = '44444444-4444-4444-a444-444444444444';
    const buyerId = '55555555-5555-4555-a555-555555555555';

    const prod = await createProduct(artisanId, {
      name: 'Terracotta Clay Pot',
      description: 'Terracotta clay pot crafted using eco-friendly natural clay.',
      price: 650,
      stock_quantity: 10,
      category: 'Pottery',
    });
    await updateProduct(prod.id, artisanId, { primary_image_url: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb' } as any);
    await publishProduct(prod.id, artisanId);

    // Place Order for 2 units
    const shipping = {
      name: 'Buyer Name',
      phone: '9876543210',
      address: '123 Craft Lane, Madurai',
    };

    const res = await createOrder(buyerId, shipping, [{ product_id: prod.id, quantity: 2 }]);
    expect(res.orders.length).toBe(1);
    const order = res.orders[0];

    expect(order.total_amount).toBe(1300);
    expect(order.status).toBe('PENDING');
    expect(order.items[0].unit_price_snapshot).toBe(650);

    // Verify stock was deducted (10 -> 8)
    const updatedProd = await getMarketplaceProductById(prod.id);
    expect(updatedProd?.stock_quantity).toBe(8);

    // Artisan updates status: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
    const conf = await updateOrderStatus(artisanId, order.id, 'CONFIRMED');
    expect(conf.status).toBe('CONFIRMED');

    const proc = await updateOrderStatus(artisanId, order.id, 'PROCESSING');
    expect(proc.status).toBe('PROCESSING');

    // Invalid status transition (DELIVERED from PROCESSING) should fail
    await expect(updateOrderStatus(artisanId, order.id, 'DELIVERED')).rejects.toThrow();
  });

  it('should restore stock on order cancellation exactly once (idempotent cancellation)', async () => {
    const artisanId = '66666666-6666-4666-a666-666666666666';
    const buyerId = '77777777-7777-4777-a777-777777777777';

    const prod = await createProduct(artisanId, {
      name: 'Brass Lamp',
      description: 'Handcrafted traditional brass lamp for festive home decor.',
      price: 2500,
      stock_quantity: 10,
      category: 'Handicrafts',
    });
    await updateProduct(prod.id, artisanId, { primary_image_url: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb' } as any);
    await publishProduct(prod.id, artisanId);

    // Order 3 items -> stock becomes 7
    const shipping = { name: 'Buyer', phone: '999', address: 'Main St' };
    const res = await createOrder(buyerId, shipping, [{ product_id: prod.id, quantity: 3 }]);
    const order = res.orders[0];

    const prodAfterOrder = await getMarketplaceProductById(prod.id);
    expect(prodAfterOrder?.stock_quantity).toBe(7);

    // Cancel order -> stock restored to 10
    const cancelledOrder = await cancelOrder(buyerId, order.id);
    expect(cancelledOrder.status).toBe('CANCELLED');

    const prodAfterCancel = await getMarketplaceProductById(prod.id);
    expect(prodAfterCancel?.stock_quantity).toBe(10);

    // Second cancellation call must NOT restore stock again (idempotent)
    await cancelOrder(buyerId, order.id);
    const prodAfterSecondCancel = await getMarketplaceProductById(prod.id);
    expect(prodAfterSecondCancel?.stock_quantity).toBe(10);
  });
});
