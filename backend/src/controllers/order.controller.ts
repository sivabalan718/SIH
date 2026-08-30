import { Request, Response } from 'express';
import {
  createOrder,
  getBuyerOrders,
  getBuyerOrderById,
  getArtisanOrders,
  updateOrderStatus,
  cancelOrder,
  OrderStatus,
} from '../services/order.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function getUserId(req: Request): string {
  const user = (req as any).user;
  const artisan = (req as any).artisan;
  return artisan?.id || user?.id || (req.headers['x-guest-buyer-id'] as string) || 'guest-user';
}

function getArtisanId(req: Request): string {
  const artisan = (req as any).artisan;
  const user = (req as any).user;
  return artisan?.id || user?.id || 'all';
}

export async function handleCreateOrder(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getUserId(req);
    const { shippingInfo, customItems, idempotencyKey } = req.body;

    if (!shippingInfo || !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      sendError(res, 'VALIDATION_ERROR', 'Name, phone number, and delivery address are required for checkout.', 400);
      return;
    }

    const result = await createOrder(buyerId, shippingInfo, customItems, idempotencyKey);

    sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    logger.error('handleCreateOrder failed:', error.message);
    sendError(res, 'CREATE_ORDER_ERROR', error.message || 'Failed to place order.', statusCode);
  }
}

export async function handleGetBuyerOrders(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getUserId(req);
    const orders = await getBuyerOrders(buyerId);

    sendSuccess(res, { orders });
  } catch (error: any) {
    logger.error('handleGetBuyerOrders failed:', error);
    sendError(res, 'BUYER_ORDERS_ERROR', error.message || 'Failed to retrieve buyer orders.', 500);
  }
}

export async function handleGetBuyerOrderById(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getUserId(req);
    const { id } = req.params;

    const order = await getBuyerOrderById(buyerId, id);
    if (!order) {
      sendError(res, 'ORDER_NOT_FOUND', 'Order not found.', 404);
      return;
    }

    sendSuccess(res, { order });
  } catch (error: any) {
    sendError(res, 'BUYER_ORDER_ERROR', error.message || 'Failed to retrieve order.', 500);
  }
}

export async function handleGetArtisanOrders(req: Request, res: Response): Promise<void> {
  try {
    const artisanId = getArtisanId(req);
    const orders = await getArtisanOrders(artisanId);

    sendSuccess(res, { orders });
  } catch (error: any) {
    logger.error('handleGetArtisanOrders failed:', error);
    sendError(res, 'ARTISAN_ORDERS_ERROR', error.message || 'Failed to retrieve artisan orders.', 500);
  }
}

export async function handleUpdateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const artisanId = getArtisanId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      sendError(res, 'VALIDATION_ERROR', 'Status is required.', 400);
      return;
    }

    const updated = await updateOrderStatus(artisanId, id, status as OrderStatus);

    sendSuccess(res, { order: updated, message: `Order status updated to ${status}.` });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'UPDATE_STATUS_ERROR', error.message || 'Failed to update order status.', statusCode);
  }
}

export async function handleCancelOrder(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const order = await cancelOrder(userId, id);

    sendSuccess(res, { order, message: 'Order cancelled and stock restored.' });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'CANCEL_ORDER_ERROR', error.message || 'Failed to cancel order.', statusCode);
  }
}
