import { Router } from 'express';
import { handleGetMarketplaceProducts, handleGetMarketplaceProductById } from '../controllers/marketplace.controller.js';

export const marketplaceRouter = Router();

marketplaceRouter.get('/products', handleGetMarketplaceProducts);
marketplaceRouter.get('/products/:id', handleGetMarketplaceProductById);
