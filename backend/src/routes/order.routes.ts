import { Router } from 'express';
import {
  handleCreateOrder,
  handleGetBuyerOrders,
  handleGetBuyerOrderById,
  handleGetArtisanOrders,
  handleUpdateOrderStatus,
  handleCancelOrder,
} from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const orderRouter = Router();

// Buyer order routes
orderRouter.post('/', handleCreateOrder);
orderRouter.get('/buyer', handleGetBuyerOrders);
orderRouter.get('/buyer/:id', handleGetBuyerOrderById);
orderRouter.patch('/:id/cancel', handleCancelOrder);

// Artisan order routes
orderRouter.get('/artisan', requireAuth, handleGetArtisanOrders);
orderRouter.patch('/artisan/:id/status', requireAuth, handleUpdateOrderStatus);
