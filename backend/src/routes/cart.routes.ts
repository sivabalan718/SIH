import { Router } from 'express';
import { handleGetCart, handleAddToCart, handleUpdateCartItem, handleRemoveCartItem, handleClearCart } from '../controllers/cart.controller.js';

export const cartRouter = Router();

cartRouter.get('/', handleGetCart);
cartRouter.post('/items', handleAddToCart);
cartRouter.patch('/items/:productId', handleUpdateCartItem);
cartRouter.delete('/items/:productId', handleRemoveCartItem);
cartRouter.delete('/', handleClearCart);
