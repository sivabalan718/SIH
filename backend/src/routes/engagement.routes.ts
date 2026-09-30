import { Router } from 'express';
import { requireAnyAuth } from '../middleware/auth.middleware.js';
import { handleImageUpload } from '../middleware/image-upload.middleware.js';
import {
  handleAddWishlist,
  handleAssistantParse,
  handleCustomerPhotoUpload,
  handleGetPreferences,
  handleGetWishlist,
  handleListNotifications,
  handleMarkAllRead,
  handleMarkRead,
  handleMergeWishlist,
  handleRemoveWishlist,
  handleSavePreferences,
} from '../controllers/engagement.controller.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireAnyAuth);
wishlistRouter.get('/', handleGetWishlist);
wishlistRouter.post('/items', handleAddWishlist);
wishlistRouter.delete('/items/:productId', handleRemoveWishlist);
wishlistRouter.post('/merge', handleMergeWishlist);

export const notificationRouter = Router();
notificationRouter.use(requireAnyAuth);
notificationRouter.get('/', handleListNotifications);
notificationRouter.post('/read-all', handleMarkAllRead);
notificationRouter.get('/preferences', handleGetPreferences);
notificationRouter.put('/preferences', handleSavePreferences);
notificationRouter.patch('/:id/read', handleMarkRead);

export const uploadRouter = Router();
uploadRouter.post('/customer-photo', requireAnyAuth, handleImageUpload, handleCustomerPhotoUpload);

export const assistantPublicRouter = Router();
assistantPublicRouter.post('/parse', handleAssistantParse);
