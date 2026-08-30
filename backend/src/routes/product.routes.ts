import { Router } from 'express';
import {
  handleCreateProduct,
  handleListProducts,
  handleGetProduct,
  handleUpdateProduct,
  handlePublishProduct,
  handleArchiveProduct,
  handleGetProductStats,
  handleUploadImage,
} from '../controllers/product.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { handleImageUpload } from '../middleware/upload.middleware.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validators.js';

const router = Router();

// All product endpoints require authenticated artisan session
router.use(requireAuth);

router.post('/', validateBody(createProductSchema), handleCreateProduct);
router.get('/', handleListProducts);
router.get('/stats', handleGetProductStats);
router.get('/:id', handleGetProduct);
router.patch('/:id', validateBody(updateProductSchema), handleUpdateProduct);
router.post('/:id/publish', handlePublishProduct);
router.post('/:id/archive', handleArchiveProduct);
router.post('/:id/image', handleImageUpload, handleUploadImage);

export default router;
