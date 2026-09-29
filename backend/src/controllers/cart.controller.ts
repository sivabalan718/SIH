import { Request, Response } from 'express';
import { getBuyerCart, addItemToCart, updateCartItemQuantity, removeCartItem, clearBuyerCart } from '../services/cart.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const GUEST_ID_RE = /^guest_[A-Za-z0-9-]{16,64}$/;

/** Per-device random guest cart id (unguessable), sent by the frontend as X-Guest-Cart-Id. */
function getGuestId(req: Request): string | null {
  const raw = req.headers['x-guest-cart-id'];
  return typeof raw === 'string' && GUEST_ID_RE.test(raw) ? raw : null;
}

function getBuyerId(req: Request): string {
  const user = (req as any).user;
  if (user?.id) return user.id;
  const guest = getGuestId(req);
  if (!guest) throw Object.assign(new Error('Missing cart session. Please refresh the page.'), { statusCode: 400 });
  return guest;
}

/** After sign-in, move anything added as a guest into the account cart (once). */
async function mergeGuestCartIfAny(req: Request): Promise<void> {
  const user = (req as any).user;
  const guest = getGuestId(req);
  if (!user?.id || !guest) return;
  try {
    const guestCart = await getBuyerCart(guest);
    if (guestCart.items.length === 0) return;
    for (const item of guestCart.items) {
      if (item.quantity > 0) await addItemToCart(user.id, item.product_id, item.quantity).catch(() => {});
    }
    await clearBuyerCart(guest);
  } catch (e: any) {
    logger.warn(`[Cart] Guest cart merge skipped: ${e?.message}`);
  }
}

export async function handleGetCart(req: Request, res: Response): Promise<void> {
  try {
    await mergeGuestCartIfAny(req);
    const buyerId = getBuyerId(req);
    const { lang } = req.query;
    const cart = await getBuyerCart(buyerId, (lang as any) || 'en');

    sendSuccess(res, { cart });
  } catch (error: any) {
    logger.error('handleGetCart failed:', error);
    sendError(res, 'CART_ERROR', error.message || 'Failed to retrieve cart.', error.statusCode || 500);
  }
}

export async function handleAddToCart(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getBuyerId(req);
    const { productId, quantity } = req.body;

    if (!productId) {
      sendError(res, 'VALIDATION_ERROR', 'productId is required.', 400);
      return;
    }

    const qty = quantity === undefined ? 1 : Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      sendError(res, 'VALIDATION_ERROR', 'Quantity must be a whole number between 1 and 100.', 400);
      return;
    }
    const cart = await addItemToCart(buyerId, String(productId), qty);

    sendSuccess(res, { cart, message: 'Item added to cart.' });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'ADD_TO_CART_ERROR', error.message || 'Failed to add item to cart.', statusCode);
  }
}

export async function handleUpdateCartItem(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getBuyerId(req);
    const { productId } = req.params;
    const { quantity } = req.body;

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      sendError(res, 'VALIDATION_ERROR', 'Quantity must be a whole number between 1 and 100.', 400);
      return;
    }
    const cart = await updateCartItemQuantity(buyerId, productId, qty);

    sendSuccess(res, { cart, message: 'Cart item updated.' });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    sendError(res, 'UPDATE_CART_ERROR', error.message || 'Failed to update cart item.', statusCode);
  }
}

export async function handleRemoveCartItem(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getBuyerId(req);
    const { productId } = req.params;

    const cart = await removeCartItem(buyerId, productId);

    sendSuccess(res, { cart, message: 'Item removed from cart.' });
  } catch (error: any) {
    sendError(res, 'REMOVE_CART_ERROR', error.message || 'Failed to remove item from cart.', 500);
  }
}

export async function handleClearCart(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getBuyerId(req);
    await clearBuyerCart(buyerId);

    sendSuccess(res, { message: 'Cart cleared.' });
  } catch (error: any) {
    sendError(res, 'CLEAR_CART_ERROR', error.message || 'Failed to clear cart.', 500);
  }
}
