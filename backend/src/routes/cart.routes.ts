import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { handleGetCart, handleAddToCart, handleUpdateCartItem, handleRemoveCartItem, handleClearCart } from '../controllers/cart.controller.js';

export const cartRouter = Router();

cartRouter.use(optionalAuth);

cartRouter.get('/', handleGetCart);
cartRouter.post('/items', handleAddToCart);
cartRouter.patch('/items/:productId', handleUpdateCartItem);
cartRouter.delete('/items/:productId', handleRemoveCartItem);
cartRouter.delete('/', handleClearCart);
