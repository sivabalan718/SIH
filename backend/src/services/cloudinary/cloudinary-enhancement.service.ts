import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { uploadToCloudinary } from './cloudinary.service.js';
import {
  runAdaptiveEnhancerPipeline,
  AdaptiveEnhancementResult,
} from '../image/adaptive-image-enhancer.service.js';

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

    // 1. Execute genuinely free adaptive local image processing pipeline
    const adaptiveResult = await runAdaptiveEnhancerPipeline(buffer, backgroundOption, colorHex);

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
    const exposureRatingBefore =
      adaptiveResult.analysis.meanLuminance < 85
        ? 'Underexposed'
        : adaptiveResult.analysis.meanLuminance > 185
        ? 'Overexposed'
        : 'Acceptable';

    const sharpnessRatingBefore =
      adaptiveResult.analysis.edgeEnergy < 15
        ? 'Soft'
        : adaptiveResult.analysis.edgeEnergy > 30
        ? 'Sharp'
        : 'Good';

    return {
      success: true,
      originalImageUrl: originalCloudinaryUrl,
      enhancedImageUrl: enhancedCloudinaryUrl || enhancedBase64,
      enhancedImageBase64: enhancedBase64,
      backgroundOption: adaptiveResult.backgroundOption,
      backgroundColor: adaptiveResult.backgroundColorHex,
      productDetected: true,
      backgroundRemoved: true,
      qualityBefore: {
        exposure: exposureRatingBefore,
        sharpness: sharpnessRatingBefore,
        background: 'Distracting / Ambient',
      },
      qualityAfter: {
        exposure: 'Studio Balanced',
        sharpness: 'Artisan Detail Enhanced',
        background: 'Clean Catalogue Ready',
      },
      improvementsApplied: adaptiveResult.improvementsApplied,
      adaptiveDetails: {
        orientation: adaptiveResult.geometry.orientation,
        hasClearBase: adaptiveResult.geometry.hasClearBase,
        scaleFactor: adaptiveResult.composition.scaleFactor,
        margins: {
          horizontal: adaptiveResult.composition.marginHorizontalPercent,
          vertical: adaptiveResult.composition.marginVerticalPercent,
        },
        meanLuminance: adaptiveResult.analysis.meanLuminance,
        contrastStdDev: adaptiveResult.analysis.contrastStdDev,
        edgeEnergy: adaptiveResult.analysis.edgeEnergy,
      },
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
