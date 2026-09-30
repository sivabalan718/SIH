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
import { handleCreateRequest, handleMyRequests, handleRequestOptions } from '../controllers/engagement.controller.js';

export const orderRouter = Router();

// Buyer order routes — a signed-in account is required so orders and payments have an owner
orderRouter.post('/', requireAnyAuth, handleCreateOrder);
orderRouter.get('/buyer', requireAnyAuth, handleGetBuyerOrders);
orderRouter.get('/buyer/:id', requireAnyAuth, handleGetBuyerOrderById);
orderRouter.patch('/:id/cancel', requireAnyAuth, handleCancelOrder);

// Refund / replacement requests (customer side)
orderRouter.get('/requests/options', handleRequestOptions);
orderRouter.get('/requests/mine', requireAnyAuth, handleMyRequests);
orderRouter.post('/:id/requests', requireAnyAuth, handleCreateRequest);

// Artisan order routes
orderRouter.get('/artisan', requireAuth, handleGetArtisanOrders);
orderRouter.patch('/artisan/:id/status', requireAuth, handleUpdateOrderStatus);
