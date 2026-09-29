import { Router } from 'express';
import {
  handleCreateOrder,
  handleGetBuyerOrders,
  handleGetBuyerOrderById,
  handleGetArtisanOrders,
  handleUpdateOrderStatus,
  handleCancelOrder,
} from '../controllers/order.controller.js';
import { requireAuth, requireAnyAuth } from '../middleware/auth.middleware.js';

export const orderRouter = Router();

// Buyer order routes — a signed-in account is required so orders and payments have an owner
orderRouter.post('/', requireAnyAuth, handleCreateOrder);
orderRouter.get('/buyer', requireAnyAuth, handleGetBuyerOrders);
orderRouter.get('/buyer/:id', requireAnyAuth, handleGetBuyerOrderById);
orderRouter.patch('/:id/cancel', requireAnyAuth, handleCancelOrder);

// Artisan order routes
orderRouter.get('/artisan', requireAuth, handleGetArtisanOrders);
orderRouter.patch('/artisan/:id/status', requireAuth, handleUpdateOrderStatus);
