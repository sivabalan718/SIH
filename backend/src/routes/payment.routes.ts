import { Router } from 'express';
import { requireAnyAuth } from '../middleware/auth.middleware.js';
import {
  handleCreatePaymentOrder,
  handlePaymentConfig,
  handlePaymentFailed,
  handleVerifyPayment,
} from '../controllers/payment.controller.js';

// The webhook route is mounted in app.ts before express.json() because it needs the raw body.
export const paymentRouter = Router();

paymentRouter.get('/config', handlePaymentConfig);
paymentRouter.post('/create-order', requireAnyAuth, handleCreatePaymentOrder);
paymentRouter.post('/verify', requireAnyAuth, handleVerifyPayment);
paymentRouter.post('/failed', requireAnyAuth, handlePaymentFailed);
