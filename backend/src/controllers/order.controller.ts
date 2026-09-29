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

/** The buyer is always the authenticated account (set by requireAnyAuth) — never a header. */
function getUserId(req: Request): string {
  return (req as any).user.id;
}

/** Artisan routes run behind requireAuth, so the artisan workspace is always present. */
function getArtisanId(req: Request): string {
  return (req as any).artisan.id;
}

const PHONE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^\d{6}$/;

export async function handleCreateOrder(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getUserId(req);
    const { shippingInfo, customItems, idempotencyKey, paymentMethod } = req.body || {};

    if (!shippingInfo || !String(shippingInfo.name || '').trim() || !shippingInfo.phone || !String(shippingInfo.address || '').trim()) {
      sendError(res, 'VALIDATION_ERROR', 'Name, phone number, and delivery address are required for checkout.', 400);
      return;
    }
    const phone = String(shippingInfo.phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!PHONE_RE.test(phone)) {
      sendError(res, 'VALIDATION_ERROR', 'Please enter a valid 10-digit Indian mobile number.', 400);
      return;
    }
    if (shippingInfo.postal_code && !PIN_RE.test(String(shippingInfo.postal_code).trim())) {
      sendError(res, 'VALIDATION_ERROR', 'Please enter a valid 6-digit PIN code.', 400);
      return;
    }
    if (paymentMethod !== undefined && paymentMethod !== 'ONLINE' && paymentMethod !== 'COD') {
      sendError(res, 'VALIDATION_ERROR', 'Unsupported payment method.', 400);
      return;
    }
    if (customItems !== undefined && !Array.isArray(customItems)) {
      sendError(res, 'VALIDATION_ERROR', 'Invalid items.', 400);
      return;
    }

    const cleanShipping = {
      name: String(shippingInfo.name).trim().slice(0, 100),
      phone,
      address: String(shippingInfo.address).trim().slice(0, 300),
      city: shippingInfo.city ? String(shippingInfo.city).trim().slice(0, 80) : undefined,
      district: shippingInfo.district ? String(shippingInfo.district).trim().slice(0, 80) : undefined,
      postal_code: shippingInfo.postal_code ? String(shippingInfo.postal_code).trim() : undefined,
    };

    const result = await createOrder(buyerId, cleanShipping, customItems, idempotencyKey, paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD');

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
