import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/artisan.controller.js';
import { handleGetArtisanOrders, handleUpdateOrderStatus } from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { handleArtisanRequests, handleUpdateRequest } from '../controllers/engagement.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { updateProfileSchema } from '../validators/auth.validators.js';

const router = Router();

router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), updateProfile);

// Artisan Order Management routes
router.get('/orders', requireAuth, handleGetArtisanOrders);
router.patch('/orders/:id/status', requireAuth, handleUpdateOrderStatus);

// Customer refund / replacement requests for this artisan's orders
router.get('/requests', requireAuth, handleArtisanRequests);
router.patch('/requests/:id', requireAuth, handleUpdateRequest);

export default router;
