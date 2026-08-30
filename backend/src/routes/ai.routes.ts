import { Router } from 'express';
import {
  handleVoiceToProduct,
  handleValidateProductImage,
  handleEnhanceProductImage,
  handleGenerateCatalogue,
  handleSaveCatalogue,
  handleGetCatalogue,
  handleExtractVoicePricing,
  handleRecommendFairPrice,
  handleSavePricing,
  handleGetPricing,
} from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { handleAudioUpload } from '../middleware/audio-upload.middleware.js';
import { handleImageUpload } from '../middleware/image-upload.middleware.js';

const router = Router();

// All AI endpoints require authenticated artisan session
router.use(requireAuth);

router.post('/voice-to-product', handleAudioUpload, handleVoiceToProduct);
router.post('/validate-image', handleImageUpload, handleValidateProductImage);
router.post('/enhance-image', handleImageUpload, handleEnhanceProductImage);

// Smart Catalogue endpoints
router.post('/generate-catalogue', handleGenerateCatalogue);
router.post('/save-catalogue', handleSaveCatalogue);
router.get('/catalogue/:productId', handleGetCatalogue);

// Smart Fair Pricing endpoints
router.post('/pricing/voice-extract', handleAudioUpload, handleExtractVoicePricing);
router.post('/pricing/recommend', handleRecommendFairPrice);
router.post('/pricing/save', handleSavePricing);
router.get('/pricing/:productId', handleGetPricing);

export default router;
