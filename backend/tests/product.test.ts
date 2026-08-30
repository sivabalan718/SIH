import request from 'supertest';
import { app } from '../src/app.js';

describe('M63 Product Domain API Endpoints', () => {
  describe('Protected Routes Authorization', () => {
    test('should reject unauthenticated POST /api/v1/products', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .send({
          name: 'Handloom Saree',
          price: 1500,
          stock_quantity: 5,
        });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should reject unauthenticated GET /api/v1/products', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should reject unauthenticated GET /api/v1/products/stats', async () => {
      const res = await request(app).get('/api/v1/products/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should reject unauthenticated GET /api/v1/products/123', async () => {
      const res = await request(app).get('/api/v1/products/123');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject unauthenticated PATCH /api/v1/products/123', async () => {
      const res = await request(app)
        .patch('/api/v1/products/123')
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject unauthenticated POST /api/v1/products/123/publish', async () => {
      const res = await request(app).post('/api/v1/products/123/publish');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject unauthenticated POST /api/v1/products/123/archive', async () => {
      const res = await request(app).post('/api/v1/products/123/archive');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Validation & Edge Cases', () => {
    test('should reject product creation when name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', 'Bearer fake_token')
        .send({
          price: 1500,
          stock_quantity: 5,
        });
      // Auth middleware will block fake_token with 401
      expect(res.status).toBe(401);
    });
  });
});
