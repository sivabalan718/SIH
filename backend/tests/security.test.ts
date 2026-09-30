import request from 'supertest';
import { app } from '../src/app.js';
import { getSupabaseAdmin } from '../src/config/supabase.js';
import { loginArtisan, registerArtisan, registerCustomer } from '../src/services/auth.service.js';

/**
 * Regression tests for the account-takeover fixes:
 *  - a wrong password must never sign in (previously it overwrote the password)
 *  - registering a second account type with an existing email must not change its password
 * Uses a throw-away account that is deleted afterwards.
 */
describe('M63 security regressions', () => {
  const email = `m63-sec-${Date.now()}@example.com`;
  const password = 'Correct-Pass-123';
  let userId: string | null = null;

  beforeAll(async () => {
    const res: any = await registerArtisan('Security Test Artisan', email, password);
    userId = res?.artisan?.supabase_user_id || res?.artisan?.supabaseUserId || null;
    if (!userId) {
      const { data } = await getSupabaseAdmin().from('artisans').select('supabase_user_id').eq('email', email).maybeSingle();
      userId = data?.supabase_user_id || null;
    }
  }, 60000);

  afterAll(async () => {
    const admin = getSupabaseAdmin();
    await admin.from('customer_profiles').delete().eq('email', email);
    await admin.from('artisans').delete().eq('email', email);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 60000);

  test('artisan login with a WRONG password is rejected and does not change the password', async () => {
    await expect(loginArtisan(email, 'Attacker-Guess-999')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    // The real password still works — it was not overwritten by the attempt
    const ok = await loginArtisan(email, password);
    expect(ok.session.accessToken).toBeTruthy();
  }, 60000);

  test('registering a customer with an existing email and a different password is refused (409)', async () => {
    await expect(
      registerCustomer({ name: 'Attacker', email, password: 'Attacker-Pass-123', mobile: '9876543210' } as any)
    ).rejects.toMatchObject({ statusCode: 409 });
    // Owner can still sign in with their own password
    const ok = await loginArtisan(email, password);
    expect(ok.session.accessToken).toBeTruthy();
  }, 60000);

  test('new customer endpoints require sign-in', async () => {
    for (const [method, path] of [
      ['get', '/api/v1/wishlist'],
      ['get', '/api/v1/notifications'],
      ['post', '/api/v1/uploads/customer-photo'],
      ['get', '/api/v1/orders/requests/mine'],
      ['post', '/api/v1/orders/ord-x/requests'],
      ['get', '/api/v1/artisan/requests'],
      ['get', '/api/v1/artisan/products/x/feedback'],
    ] as const) {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(401);
    }
  });

  test('customer registration validates mobile, PIN and password strength', async () => {
    const bad = await request(app)
      .post('/api/v1/auth/customer/register')
      .send({ name: 'A Buyer', email: 'buyer@example.com', password: 'short', mobile: '12345', postalCode: '12' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('public reviews never expose customer or order identifiers', async () => {
    const res = await request(app).get('/api/v1/products/10000000-0000-4000-8000-000000000105/reviews');
    expect(res.status).toBe(200);
    for (const r of res.body.data.recent_reviews || []) {
      expect(r.customer_id).toBeUndefined();
      expect(r.order_id).toBeUndefined();
    }
  });

  test('M63 AI parser never fails the shopper: returns parsed filters or a clean fallback', async () => {
    const res = await request(app).post('/api/v1/marketplace/assistant/parse').send({ query: 'மண் பானை 500 ரூபாய்க்குள்', categories: ['Pottery'] });
    expect(res.status).toBe(200);
    expect(['gemini', 'unavailable']).toContain(res.body.data.source);
  }, 30000);
});
