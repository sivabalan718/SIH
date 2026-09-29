import request from 'supertest';
import { app } from '../src/app.js';
import { getSupabaseAdmin } from '../src/config/supabase.js';
import { createProduct, publishProduct } from '../src/services/product.service.js';
import { createOrder, getArtisanOrders } from '../src/services/order.service.js';
import {
  computePaymentSignature,
  createPaymentOrder,
  isPaymentsConfigured,
  verifyPayment,
} from '../src/services/payment.service.js';

/**
 * Razorpay integration tests. Uses the real database and Razorpay TEST mode (when keys exist).
 * A real card/UPI success can only be produced by the Razorpay checkout UI, so "successful
 * payment" is covered by the manual steps in the report; everything else is automated here.
 */
describe('M63 Razorpay payments', () => {
  const supabase = getSupabaseAdmin();
  const artisanId = '11111111-1111-4111-a111-111111111111';
  const buyerA = `test-buyer-a-${Date.now()}`;
  const buyerB = `test-buyer-b-${Date.now()}`;
  const shipping = { name: 'Test Buyer', phone: '9876543210', address: '12 Test Street, Chennai', postal_code: '600001' };
  const createdOrderIds: string[] = [];
  let productId = '';
  let cheapProductId = '';

  beforeAll(async () => {
    const p = await createProduct(artisanId, { name: 'Payment Test Clay Cup', description: 'Test item', price: 450, stock_quantity: 50, category: 'Pottery' });
    await publishProduct(p.id, artisanId).catch(() => undefined);
    productId = p.id;
    const cheap = await createProduct(artisanId, { name: 'Payment Test Thread', description: 'Test item', price: 0.5, stock_quantity: 50, category: 'Textiles' });
    await publishProduct(cheap.id, artisanId).catch(() => undefined);
    cheapProductId = cheap.id;
  }, 60000);

  afterAll(async () => {
    if (createdOrderIds.length) await supabase.from('orders').delete().in('id', createdOrderIds);
  });

  const placeOnline = async (buyer: string, pid = productId, qty = 2) => {
    const res = await createOrder(buyer, shipping, [{ product_id: pid, quantity: qty }], undefined, 'ONLINE');
    createdOrderIds.push(...res.orders.map((o) => o.id));
    return res;
  };

  test('create-order and verify endpoints require authentication (401)', async () => {
    const a = await request(app).post('/api/v1/payments/create-order').send({ orderId: 'x', amount: 5000 });
    expect(a.status).toBe(401);
    const b = await request(app).post('/api/v1/payments/verify').send({});
    expect(b.status).toBe(401);
  });

  test('payment config never exposes the key secret', async () => {
    const res = await request(app).get('/api/v1/payments/config');
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(process.env.RAZORPAY_KEY_SECRET || '__no_secret__');
  });

  test('online orders are hidden from the artisan until paid', async () => {
    const { orders } = await placeOnline(buyerA, productId, 1);
    const artisanView = await getArtisanOrders(artisanId);
    expect(artisanView.some((o) => o.id === orders[0].id)).toBe(false);
    expect(orders[0].payment_status).toBe('PENDING');
  }, 30000);

  (isPaymentsConfigured() ? test : test.skip)(
    'amount comes from the database, not the client (manipulation ignored)',
    async () => {
      const { orders, checkout_group_id } = await placeOnline(buyerA, productId, 2);
      // A client pretending the amount is ₹50 has no effect: there is no amount input at all.
      const rzp = await createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id, ...( { amount: 5000 } as any) });
      expect(rzp.amount).toBe(Math.round(orders[0].total_amount * 100));
      expect(rzp.amount).toBe(90000);
      expect(rzp.order_id).toMatch(/^order_/);
      expect((rzp as any).key_secret).toBeUndefined();

      // Double click / retry reuses the same Razorpay order (duplicate protection)
      const again = await createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id });
      expect(again.order_id).toBe(rzp.order_id);
    },
    30000
  );

  (isPaymentsConfigured() ? test : test.skip)(
    'amount below ₹1 is rejected',
    async () => {
      const { checkout_group_id } = await placeOnline(buyerA, cheapProductId, 1);
      await expect(createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id })).rejects.toMatchObject({ statusCode: 400, code: 'AMOUNT_TOO_LOW' });
    },
    30000
  );

  test('another customer cannot pay for or see my order (403)', async () => {
    const { orders } = await placeOnline(buyerA, productId, 1);
    await expect(createPaymentOrder(buyerB, { orderId: orders[0].id })).rejects.toMatchObject({ statusCode: 403 });
  }, 30000);

  test('unknown order is 404', async () => {
    await expect(createPaymentOrder(buyerA, { orderId: 'ord-does-not-exist' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('missing verification fields are rejected (400)', async () => {
    await expect(verifyPayment(buyerA, { razorpay_order_id: '', razorpay_payment_id: '', razorpay_signature: '' })).rejects.toMatchObject({ statusCode: 400 });
  });

  (isPaymentsConfigured() ? test : test.skip)(
    'invalid signature is rejected and the order is NOT marked paid',
    async () => {
      const { orders, checkout_group_id } = await placeOnline(buyerA, productId, 1);
      const rzp = await createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id });
      await expect(
        verifyPayment(buyerA, { razorpay_order_id: rzp.order_id, razorpay_payment_id: 'pay_FAKE12345678', razorpay_signature: 'a'.repeat(64) })
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_SIGNATURE' });
      const { data } = await supabase.from('orders').select('payment_status').eq('id', orders[0].id).single();
      expect(data?.payment_status).not.toBe('PAID');
    },
    30000
  );

  (isPaymentsConfigured() ? test : test.skip)(
    'valid signature for an order that is not M63’s is rejected (wrong mapping)',
    async () => {
      const fakeOrder = 'order_NOTANM63ORDER01';
      const pay = 'pay_TESTPAYMENT00001';
      await expect(
        verifyPayment(buyerA, { razorpay_order_id: fakeOrder, razorpay_payment_id: pay, razorpay_signature: computePaymentSignature(fakeOrder, pay) })
      ).rejects.toMatchObject({ statusCode: 400, code: 'ORDER_MISMATCH' });
    },
    30000
  );

  (isPaymentsConfigured() ? test : test.skip)(
    'a signature-valid but non-existent payment id is rejected by the Razorpay cross-check',
    async () => {
      const { orders, checkout_group_id } = await placeOnline(buyerA, productId, 1);
      const rzp = await createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id });
      const pay = 'pay_DOESNOTEXIST001';
      await expect(
        verifyPayment(buyerA, { razorpay_order_id: rzp.order_id, razorpay_payment_id: pay, razorpay_signature: computePaymentSignature(rzp.order_id, pay) })
      ).rejects.toMatchObject({ statusCode: 400 });
      const { data } = await supabase.from('orders').select('payment_status').eq('id', orders[0].id).single();
      expect(data?.payment_status).not.toBe('PAID');
    },
    30000
  );

  (isPaymentsConfigured() ? test : test.skip)(
    'wrong customer verifying a real order is forbidden (403)',
    async () => {
      const { checkout_group_id } = await placeOnline(buyerA, productId, 1);
      const rzp = await createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id });
      const pay = 'pay_TESTPAYMENT00002';
      await expect(
        verifyPayment(buyerB, { razorpay_order_id: rzp.order_id, razorpay_payment_id: pay, razorpay_signature: computePaymentSignature(rzp.order_id, pay) })
      ).rejects.toMatchObject({ statusCode: 403 });
    },
    30000
  );

  (isPaymentsConfigured() ? test : test.skip)(
    'duplicate verification of an already-paid order is idempotent',
    async () => {
      const { orders, checkout_group_id } = await placeOnline(buyerA, productId, 1);
      const rzp = await createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id });
      const pay = 'pay_TESTPAYMENT00003';
      // Simulate the first successful verification (only reachable through the real checkout UI)
      await supabase.from('orders').update({ payment_status: 'PAID', razorpay_payment_id: pay, paid_at: new Date().toISOString() }).eq('id', orders[0].id);
      const res = await verifyPayment(buyerA, { razorpay_order_id: rzp.order_id, razorpay_payment_id: pay, razorpay_signature: computePaymentSignature(rzp.order_id, pay) });
      expect(res.already_processed).toBe(true);
      // Paying the same order again is refused
      await expect(createPaymentOrder(buyerA, { checkoutGroupId: checkout_group_id })).rejects.toMatchObject({ statusCode: 409 });
      // And now the artisan can see it
      const artisanView = await getArtisanOrders(artisanId);
      expect(artisanView.some((o) => o.id === orders[0].id)).toBe(true);
    },
    30000
  );
});
