import request from 'supertest';
import { app } from '../src/app.js';

describe('M63 Authentication API Endpoints', () => {
  describe('POST /api/v1/auth/register validation', () => {
    test('should reject registration when name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject registration when passwords mismatch', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Artisan Name',
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'differentPassword',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject registration with malformed email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Artisan Name',
          email: 'invalid-email',
          password: 'password123',
          confirmPassword: 'password123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login validation', () => {
    test('should reject login when identifier is empty', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '',
          password: 'password123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Routes Authorization', () => {
    test('should block unauthenticated access to /api/v1/auth/me', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should block unauthenticated access to /api/v1/artisan/profile', async () => {
      const res = await request(app).get('/api/v1/artisan/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
