import { Router } from 'express';
import authRoutes from './auth.routes.js';
import artisanRoutes from './artisan.routes.js';
import productRoutes from './product.routes.js';
import aiRoutes from './ai.routes.js';
import { marketplaceRouter } from './marketplace.routes.js';
import { cartRouter } from './cart.routes.js';
import { orderRouter } from './order.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { reviewRouter } from './review.routes.js';
import { paymentRouter } from './payment.routes.js';
import { assistantPublicRouter, notificationRouter, uploadRouter, wishlistRouter } from './engagement.routes.js';

import assistantRoutes from './assistant.routes.js';

const router = Router();

// Public review routes first: /products/:id/reviews must not hit the artisan-only products router.
router.use('/', reviewRouter);
router.use('/auth', authRoutes);
router.use('/artisan', artisanRoutes);
router.use('/products', productRoutes);
router.use('/ai', aiRoutes);
router.use('/assistant', assistantRoutes);
router.use('/marketplace', marketplaceRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/analytics', analyticsRouter);
router.use('/payments', paymentRouter);
router.use('/wishlist', wishlistRouter);
router.use('/notifications', notificationRouter);
router.use('/uploads', uploadRouter);
router.use('/marketplace/assistant', assistantPublicRouter);

export default router;
