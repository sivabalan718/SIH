import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface ImageEnhancementResponse {
  success: boolean;
  enhancedImageBuffer?: Buffer;
  mimeType?: string;
  isAiEnhanced?: boolean;
  code?: string;
  message?: string;
  originalImagePreserved: boolean;
}

export class ImageEnhancementService {
  public async enhanceImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ImageEnhancementResponse> {
    const apiKey = env.geminiApiKey;
    if (!apiKey || env.aiMockMode) {
      return {
        success: false,
        code: 'AI_IMAGE_ENHANCEMENT_UNAVAILABLE',
        message: 'AI photo enhancement is currently unavailable. Your original photo is safe.',
        originalImagePreserved: true,
      };
    }

    const primaryModel = env.geminiImageModel || 'gemini-3.1-flash-image';
    const safetyInstruction = `
Preserve the exact identity and factual appearance of the uploaded artisan product.
Improve photographic presentation only (lighting balance, clarity, framing, contrast).
Do not invent, remove, redesign, recolor, reshape, or replace the product.
Preserve its actual materials, patterns, embroidery, texture, proportions, and distinctive features.
`;

    try {
      logger.info(`[ImageEnhancementService] Attempting AI enhancement with model [${primaryModel}]`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`;
      const base64Input = imageBuffer.toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: safetyInstruction },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Input,
                  },
                },
              ],
            },
          ],
        }),
      });

      const json: any = await response.json();

      if (!response.ok) {
        const errorMsg = json?.error?.message || `HTTP ${response.status}`;
        logger.warn(`[ImageEnhancementService] Model [${primaryModel}] returned error: ${errorMsg}`);

        // Return controlled unavailable state without faking enhancement
        return {
          success: false,
          code: 'AI_IMAGE_ENHANCEMENT_UNAVAILABLE',
          message: 'AI photo enhancement is currently unavailable on your Gemini plan. Your original photo is safe.',
          originalImagePreserved: true,
        };
      }

      // Check if image data or inline_data returned in candidate parts
      const candidateParts = json.candidates?.[0]?.content?.parts || [];
      const imagePart = candidateParts.find(
        (p: any) => p.inline_data || p.inlineData
      );

      if (imagePart) {
        const returnedInline = imagePart.inline_data || imagePart.inlineData;
        const returnedBase64 = returnedInline.data;
        const returnedMime = returnedInline.mime_type || returnedInline.mimeType || mimeType;

        const enhancedBuffer = Buffer.from(returnedBase64, 'base64');
        logger.info(`[ImageEnhancementService] AI Enhancement succeeded with model [${primaryModel}]`);

        return {
          success: true,
          enhancedImageBuffer: enhancedBuffer,
          mimeType: returnedMime,
          isAiEnhanced: true,
          originalImagePreserved: true,
        };
      }

      logger.warn(`[ImageEnhancementService] Model [${primaryModel}] did not return inline image data`);
      return {
        success: false,
        code: 'AI_IMAGE_ENHANCEMENT_UNAVAILABLE',
        message: 'AI photo enhancement model did not produce an image. Your original photo is safe.',
        originalImagePreserved: true,
      };
    } catch (err: any) {
      logger.error('[ImageEnhancementService] Image enhancement exception:', err.message);
      return {
        success: false,
        code: 'AI_IMAGE_ENHANCEMENT_UNAVAILABLE',
        message: 'AI photo enhancement service encountered an issue. Your original photo is safe.',
        originalImagePreserved: true,
      };
    }
  }
}

export const imageEnhancementService = new ImageEnhancementService();
