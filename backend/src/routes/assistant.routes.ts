import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { processAssistantQuery } from '../controllers/assistant.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB audio limit protection
});

const router = Router();

// Secure Authenticated Assistant Endpoint
router.post('/query', requireAuth, upload.single('audio'), processAssistantQuery);

export default router;
