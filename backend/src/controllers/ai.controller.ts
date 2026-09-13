import { Request, Response, NextFunction } from 'express';
import { aiProviderService } from '../services/ai/ai-provider.service.js';
import { sanitizeExtractedData } from '../validators/ai.validators.js';
import { createProduct } from '../services/product.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export async function handleVoiceToProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    if (!req.file) {
      return sendError(res, 'MISSING_AUDIO', 'Please provide an audio recording of your product.', 400);
    }

    const targetField = req.body.targetField || req.body.target_field;
    const questionLanguage = req.body.questionLanguage || req.body.question_language || 'en';
    const browserTranscript = req.body.browserTranscript || req.body.browser_transcript;
    const requestId = `VOICE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    logger.info(
      `[VOICE_REQUEST_START] requestId=${requestId} userId=${artisan.id} targetField=${targetField || 'all'} questionLanguage=${questionLanguage} audioBytes=${req.file.buffer.length} mimeType=${req.file.mimetype}`
    );

    // 1. Process voice through Gemini Multimodal Transcription & LLM Extraction
    const aiResult = await aiProviderService.processVoiceToProduct(
      req.file.buffer,
      req.file.mimetype,
      targetField,
      questionLanguage,
      browserTranscript
    );

    logger.info(
      `[VOICE_TRANSCRIPTION_RESULT] requestId=${requestId} transcript="${aiResult.transcript}" detectedLanguage=${aiResult.detectedLanguage}`
    );

    // 2. Sanitize & validate extracted fields
    const sanitized = sanitizeExtractedData(aiResult.extractedData);

    logger.info(
      `[VOICE_EXTRACTION_RESULT] requestId=${requestId} targetField=${targetField || 'all'} extractedKeys=${Object.keys(aiResult.extractedData).filter((k) => (aiResult.extractedData as any)[k] != null).join(',')}`
    );

    // If request is for a specific field, return field extraction result directly
    if (targetField && targetField !== 'all') {
      return sendSuccess(res, {
        message: `M63 Assistant processed voice for field "${targetField}".`,
        requestId,
        transcript: aiResult.transcript,
        detectedLanguage: aiResult.detectedLanguage,
        confidence: aiResult.confidence,
        targetField,
        questionLanguage,
        extractedData: aiResult.extractedData,
        needsClarification: Boolean(aiResult.extractedData.needs_clarification),
        clarificationMessage: aiResult.extractedData.clarification_message || null,
      }, 200);
    }

    // 3. For full product voice recordings, create AI-assisted Draft Product
    const productDraft = await createProduct(artisan.id, {
      name: sanitized.name,
      description: sanitized.description,
      category: sanitized.category,
      subcategory: sanitized.subcategory,
      material: sanitized.material,
      color: sanitized.color,
      craft_type: sanitized.craft_type,
      features: sanitized.features,
      price: aiResult.extractedData.price || 0,
      stock_quantity: aiResult.extractedData.stock_quantity || 0,
    });

    const supabase = getSupabaseAdmin();
    await supabase
      .from('products')
      .update({ creation_source: 'AI_ASSISTED' })
      .eq('id', productDraft.id);

    productDraft.creation_source = 'AI_ASSISTED';

    logger.info(`AI Voice Product Draft created: ${productDraft.id} for artisan ${artisan.id}`);

    return sendSuccess(res, {
      message: 'M63 Assistant processed your product voice description successfully.',
      transcript: aiResult.transcript,
      detectedLanguage: aiResult.detectedLanguage,
      confidence: aiResult.confidence,
      targetField: targetField || 'all',
      questionLanguage,
      extractedData: aiResult.extractedData,
      needsClarification: Boolean(aiResult.extractedData.needs_clarification),
      clarificationMessage: aiResult.extractedData.clarification_message || null,
      productDraft: {
        id: productDraft.id,
        artisanId: productDraft.artisan_id,
        name: productDraft.name,
        description: productDraft.description,
        category: productDraft.category,
        subcategory: productDraft.subcategory,
        material: productDraft.material,
        color: productDraft.color,
        craftType: productDraft.craft_type,
        features: productDraft.features,
        price: productDraft.price,
        stockQuantity: productDraft.stock_quantity,
        status: productDraft.status,
        creationSource: 'AI_ASSISTED',
        createdAt: productDraft.created_at,
      },
    }, 201);
  } catch (err: any) {
    if (err.code === 'NO_SPEECH_DETECTED' || err.code === 'SPEECH_UNCONFIGURED' || err.code === 'AI_UNCONFIGURED') {
      return sendError(res, err.code, err.message, err.statusCode || 400);
    }
    next(err);
  }
}

export async function handleValidateProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    if (!req.file) {
      return sendError(res, 'MISSING_IMAGE', 'Please provide an image file to validate.', 400);
    }

    const { analyzeProductImage } = await import('../services/cloudinary/cloudinary-analysis.service.js');
    const result = await analyzeProductImage(req.file.buffer, req.file.mimetype);

    return sendSuccess(res, {
      message: result.feedbackMessage,
      validation: {
        isValidProductImage: result.isProductImage,
        qualityRating: result.qualityRating,
        feedbackMessage: result.feedbackMessage,
        productCategory: result.productCategory,
        confidence: result.confidence,
        aiVisionUsed: result.aiVisionUsed,
      },
    }, 200);
  } catch (err) {
    next(err);
  }
}

export async function handleEnhanceProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    if (!req.file) {
      return sendError(res, 'MISSING_IMAGE', 'Please provide an image file to enhance.', 400);
    }

    const productId = (req.body.productId || req.body.product_id || 'temp') as string;
    const backgroundOption = (req.body.backgroundOption || req.body.background_option || 'WHITE') as string;
    const colorHex = (req.body.colorHex || req.body.color_hex) as string | undefined;

    const { enhanceProductPhoto } = await import('../services/cloudinary/cloudinary-enhancement.service.js');
    const result = await enhanceProductPhoto(
      req.file.buffer,
      req.file.mimetype,
      artisan.id,
      productId,
      backgroundOption,
      colorHex
    );

    if (!result.success) {
      return sendSuccess(res, {
        message: result.message || 'Photo enhancement is currently unavailable. Your original photo is safe.',
        enhancedAvailable: false,
        code: 'PHOTO_ENHANCEMENT_UNAVAILABLE',
        originalImagePreserved: true,
      }, 200);
    }

    return sendSuccess(res, {
      message: result.message || 'Product photo presentation enhanced successfully.',
      enhancedAvailable: true,
      enhancedImageUrl: result.enhancedImageUrl || null,
      enhancedImageBase64: result.enhancedImageBase64 || null,
      originalImageUrl: result.originalImageUrl || null,
      improvementsApplied: result.improvementsApplied || [],
      isAiEnhanced: true,
      originalImagePreserved: true,
    }, 200);
  } catch (err) {
    next(err);
  }
}

export async function handleGenerateCatalogue(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const { productId, productData, language = 'en', style = 'PROFESSIONAL', section } = req.body;
    if (!productData && !productId) {
      return sendError(res, 'BAD_REQUEST', 'Please provide product information or productId for catalogue generation.', 400);
    }

    const { generateCatalogueContent } = await import('../services/ai/catalogue-generation.service.js');
    const { saveCatalogueContent } = await import('../services/catalogue.service.js');

    const generated = await generateCatalogueContent(productData || {}, language, style, section);

    let savedRecord = null;
    if (productId) {
      savedRecord = await saveCatalogueContent(productId, artisan.id, language, generated, style, 'm63');
    }

    return sendSuccess(res, {
      message: `M63 Smart Catalogue generated successfully in ${language.toUpperCase()}.`,
      productId: productId || null,
      language,
      style,
      catalogue: generated,
      savedRecord,
      generatedBy: 'm63',
    }, 200);
  } catch (err) {
    next(err);
  }
}

export async function handleSaveCatalogue(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const { productId, language = 'en', catalogue, style = 'PROFESSIONAL', generatedBy = 'artisan' } = req.body;
    if (!productId || !catalogue) {
      return sendError(res, 'BAD_REQUEST', 'Please provide productId and catalogue payload.', 400);
    }

    const { saveCatalogueContent } = await import('../services/catalogue.service.js');
    const saved = await saveCatalogueContent(productId, artisan.id, language, catalogue, style, generatedBy);

    return sendSuccess(res, {
      message: `Catalogue content saved successfully for ${language.toUpperCase()}.`,
      record: saved,
    }, 200);
  } catch (err) {
    next(err);
  }
}

export async function handleGetCatalogue(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.productId || (req.query.productId as string);
    if (!productId) {
      return sendError(res, 'BAD_REQUEST', 'Please provide productId.', 400);
    }

    const { getAllLanguagesCatalogue } = await import('../services/catalogue.service.js');
    const catalogueMap = await getAllLanguagesCatalogue(productId, artisan.id);

    let savedStyle = 'PROFESSIONAL';
    for (const lang of ['en', 'ta', 'hi'] as const) {
      if (catalogueMap[lang]?.tone_style) {
        savedStyle = catalogueMap[lang]!.tone_style;
        break;
      }
    }

    return sendSuccess(res, {
      productId,
      style: savedStyle,
      catalogues: catalogueMap,
    }, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Multilingual Voice Extraction for Pricing Attributes
 */
export async function handleExtractVoicePricing(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    if (!req.file) {
      return sendError(res, 'MISSING_AUDIO', 'Please provide an audio recording of your cost input.', 400);
    }

    const language = (req.body.language || req.body.questionLanguage || 'en') as 'en' | 'ta' | 'hi';
    const browserTranscript = req.body.browserTranscript || req.body.browser_transcript;

    const { extractPricingFromVoice } = await import('../services/ai/pricing-intelligence.service.js');
    const result = await extractPricingFromVoice(
      req.file.buffer,
      req.file.mimetype,
      language,
      browserTranscript
    );

    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Fair Selling Price Recommendation
 */
export async function handleRecommendFairPrice(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const { input, language = 'en', productId } = req.body;
    if (!input) {
      return sendError(res, 'BAD_REQUEST', 'Please provide pricing and product inputs.', 400);
    }

    const payload = {
      ...input,
      productId: productId || input.productId || input.id || undefined,
    };

    const { generateFairPriceRecommendation } = await import('../services/ai/pricing-intelligence.service.js');
    const recommendation = await generateFairPriceRecommendation(payload, language);

    return sendSuccess(res, recommendation, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Save Pricing Intelligence Record
 */
export async function handleSavePricing(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const { productId, pricingData } = req.body;
    if (!productId || !pricingData) {
      return sendError(res, 'BAD_REQUEST', 'Please provide productId and pricingData.', 400);
    }

    const { savePricingRecord } = await import('../services/pricing.service.js');
    const saved = await savePricingRecord(productId, artisan.id, pricingData);

    return sendSuccess(res, {
      message: 'Smart Fair Pricing state saved successfully.',
      record: saved,
    }, 200);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Get Pricing Intelligence Record
 */
export async function handleGetPricing(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.productId || (req.query.productId as string);
    if (!productId) {
      return sendError(res, 'BAD_REQUEST', 'Please provide productId.', 400);
    }

    const { getPricingRecord } = await import('../services/pricing.service.js');
    const record = await getPricingRecord(productId, artisan.id);

    return sendSuccess(res, {
      productId,
      pricing: record,
    }, 200);
  } catch (err) {
    next(err);
  }
}
