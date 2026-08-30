import { Router } from 'express';
import authRoutes from './auth.routes.js';
import artisanRoutes from './artisan.routes.js';
import productRoutes from './product.routes.js';
import aiRoutes from './ai.routes.js';
import { marketplaceRouter } from './marketplace.routes.js';
import { cartRouter } from './cart.routes.js';
import { orderRouter } from './order.routes.js';
import { analyticsRouter } from './analytics.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/artisan', artisanRoutes);
router.use('/products', productRoutes);
router.use('/ai', aiRoutes);
router.use('/marketplace', marketplaceRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/analytics', analyticsRouter);

export default router;
