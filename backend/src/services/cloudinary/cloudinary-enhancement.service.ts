import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { uploadToCloudinary } from './cloudinary.service.js';
import {
  processProductImage,
  runAdaptiveEnhancerPipeline,
  AdaptiveEnhancementResult,
} from '../image/m63-image-enhancer.service.js';

export interface EnhancementResult {
  success: boolean;
  originalImageUrl?: string;
  enhancedImageUrl?: string;
  enhancedImageBase64?: string;
  backgroundOption?: string;
  backgroundColor?: string;
  productDetected?: boolean;
  backgroundRemoved?: boolean;
  qualityBefore?: { exposure: string; sharpness: string; background: string };
  qualityAfter?: { exposure: string; sharpness: string; background: string };
  improvementsApplied?: string[];
  message?: string;
  fallbackTriggered?: boolean;
  processingMode?: string;
  adaptiveDetails?: {
    orientation: string;
    hasClearBase: boolean;
    scaleFactor: number;
    margins: { horizontal: number; vertical: number };
    meanLuminance: number;
    contrastStdDev: number;
    edgeEnergy: number;
  };
}

export async function enhanceProductPhoto(
  buffer: Buffer,
  mimeType: string,
  userId: string = 'artisan',
  productId: string = 'temp',
  backgroundOption: string = 'WHITE',
  colorHex?: string
): Promise<EnhancementResult> {
  try {
    logger.info(
      `[M63] [AdaptiveStudio] Initiating adaptive photo enhancement pipeline (User: ${userId}, Product: ${productId}, Option: ${backgroundOption})`
    );

    // 1. Execute new M63 image processing engine
    const adaptiveResult = await processProductImage(buffer, backgroundOption, colorHex);

    // Never store a placeholder for an image that could not be decoded.
    if (adaptiveResult.inputUnusable) {
      return {
        success: false,
        message: 'This photo could not be read. Please upload a clear JPG or PNG photo — your original is safe.',
      };
    }

    const enhancedBase64 = `data:${adaptiveResult.mimeType};base64,${adaptiveResult.enhancedBuffer.toString('base64')}`;

    // 2. Cloudinary Storage & CDN Layer (purely storage/delivery, never AI enhancer)
    const isCloudinaryConfigured = Boolean(
      env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
    );

    let enhancedCloudinaryUrl: string | undefined = undefined;
    let originalCloudinaryUrl: string | undefined = undefined;

    if (isCloudinaryConfigured) {
      try {
        const originalFolder = `m63/${userId}/products/${productId}/original`;
        const enhancedFolder = `m63/${userId}/products/${productId}/enhanced`;

        // Store original separately
        const uploadedOriginal = await uploadToCloudinary(buffer, originalFolder);
        originalCloudinaryUrl = uploadedOriginal.secureUrl;

        // Store enhanced separately
        const uploadedEnhanced = await uploadToCloudinary(adaptiveResult.enhancedBuffer, enhancedFolder);
        enhancedCloudinaryUrl = uploadedEnhanced.secureUrl;

        logger.info(`[CloudinaryStorage] Original image stored: ${originalCloudinaryUrl}`);
        logger.info(`[CloudinaryStorage] Enhanced image stored: ${enhancedCloudinaryUrl}`);
      } catch (cloudErr: any) {
        logger.warn('[CloudinaryStorage] Cloudinary API upload notice (falling back to base64 data):', cloudErr?.message);
      }
    }

    // Determine quality ratings from actual image analysis
    const meanLum = adaptiveResult.analysis?.meanLuminance ?? 128;
    const edgeEng = adaptiveResult.analysis?.edgeEnergy ?? 20;

    const exposureRatingBefore =
      meanLum < 85
        ? 'Underexposed'
        : meanLum > 185
        ? 'Overexposed'
        : 'Acceptable';

    const sharpnessRatingBefore =
      edgeEng < 15
        ? 'Soft'
        : edgeEng > 30
        ? 'Sharp'
        : 'Good';

    return {
      success: true,
      originalImageUrl: originalCloudinaryUrl,
      enhancedImageUrl: enhancedCloudinaryUrl || enhancedBase64,
      enhancedImageBase64: enhancedBase64,
      backgroundOption: adaptiveResult.backgroundOption,
      backgroundColor: adaptiveResult.backgroundColorHex,
      productDetected: adaptiveResult.processingMode === 'STUDIO',
      backgroundRemoved: adaptiveResult.processingMode === 'STUDIO',
      fallbackTriggered: adaptiveResult.fallbackTriggered,
      processingMode: adaptiveResult.processingMode,
      qualityBefore: {
        exposure: exposureRatingBefore,
        sharpness: sharpnessRatingBefore,
        background: 'Original scene',
      },
      qualityAfter: {
        exposure: 'Adaptively balanced',
        sharpness: 'Adaptively sharpened',
        background:
          adaptiveResult.processingMode === 'STUDIO'
            ? 'Clean studio background'
            : adaptiveResult.processingMode === 'ORIGINAL_BACKGROUND'
            ? 'Original background kept'
            : 'Framed (background kept)',
      },
      improvementsApplied: adaptiveResult.improvementsApplied || [],
      adaptiveDetails: adaptiveResult.geometry && adaptiveResult.composition && adaptiveResult.analysis ? {
        orientation: adaptiveResult.geometry.orientation,
        hasClearBase: adaptiveResult.geometry.hasClearBase,
        scaleFactor: adaptiveResult.composition.scaleFactor,
        margins: {
          horizontal: adaptiveResult.composition.marginHorizontalPercent ?? 10,
          vertical: adaptiveResult.composition.marginVerticalPercent ?? 10,
        },
        meanLuminance: adaptiveResult.analysis.meanLuminance,
        contrastStdDev: adaptiveResult.analysis.contrastStdDev,
        edgeEnergy: adaptiveResult.analysis.edgeEnergy,
      } : undefined,
      message: adaptiveResult.message,
    };
  } catch (err: any) {
    logger.error('[M63] [AdaptiveStudio] Enhancement error:', err?.message);
    return {
      success: false,
      message: 'Photo enhancement is currently unavailable. Your original photo is completely safe.',
    };
  }
}
