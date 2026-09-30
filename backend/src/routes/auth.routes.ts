import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  registerCustomerHandler,
  loginCustomerHandler,
  getCustomerProfileHandler,
  updateCustomerProfileHandler,
} from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, customerRegisterSchema, customerProfileUpdateSchema } from '../validators/auth.validators.js';
import { requireAuth, requireCustomerAuth, requireAnyAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Artisan Auth Routes (Unchanged)
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', requireAnyAuth, logout);
router.get('/me', requireAnyAuth, getMe);

// Dedicated Customer Auth Routes
router.post('/customer/register', validateBody(customerRegisterSchema), registerCustomerHandler);
router.post('/customer/login', loginCustomerHandler);

// Customer Profile Routes
router.get('/customer/profile', requireCustomerAuth, getCustomerProfileHandler);
router.put('/customer/profile', requireCustomerAuth, validateBody(customerProfileUpdateSchema), updateCustomerProfileHandler);

export default router;
