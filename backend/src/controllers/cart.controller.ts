import { Request, Response } from 'express';
import { getBuyerCart, addItemToCart, updateCartItemQuantity, removeCartItem, clearBuyerCart } from '../services/cart.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

function getBuyerId(req: Request): string {
  const user = (req as any).user;
  const artisan = (req as any).artisan;
  return user?.id || artisan?.id || (req.headers['x-guest-cart-id'] as string) || 'guest-buyer';
}

export async function handleGetCart(req: Request, res: Response): Promise<void> {
  try {
    const buyerId = getBuyerId(req);
    const { lang } = req.query;
    const cart = await getBuyerCart(buyerId, (lang as any) || 'en');

    sendSuccess(res, { cart });
  } catch (error: any) {
    logger.error('handleGetCart failed:', error);
    sendError(res, 'CART_ERROR', error.message || 'Failed to retrieve cart.', 500);
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

    const cart = await addItemToCart(buyerId, productId, Number(quantity) || 1);

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

    const cart = await updateCartItemQuantity(buyerId, productId, Number(quantity));

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
