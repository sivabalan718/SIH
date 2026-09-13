import { Request, Response, NextFunction } from 'express';
import {
  createProduct,
  getProductsByArtisan,
  getProductById,
  updateProduct,
  publishProduct,
  archiveProduct,
  getProductStats,
  uploadProductImage,
  enhanceExistingProduct,
  selectProductImageVariant,
} from '../services/product.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function handleCreateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const product = await createProduct(artisan.id, req.body);
    return sendSuccess(res, { message: 'Product saved as draft.', product }, 201);
  } catch (err) {
    next(err);
  }
}

export async function handleListProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const statusFilter = req.query.status as string | undefined;
    const products = await getProductsByArtisan(artisan.id, statusFilter);
    return sendSuccess(res, { products });
  } catch (err) {
    next(err);
  }
}

export async function handleGetProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.id;
    const product = await getProductById(productId, artisan.id);

    if (!product) {
      return sendError(res, 'NOT_FOUND', 'Product not found.', 404);
    }

    return sendSuccess(res, { product });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
      return sendError(res, 'FORBIDDEN', err.message || 'Access denied. You do not own this product.', 403);
    }
    next(err);
  }
}

export async function handleUpdateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.id;
    const product = await updateProduct(productId, artisan.id, req.body);
    return sendSuccess(res, { message: 'Product updated successfully.', product });
  } catch (err) {
    next(err);
  }
}

export async function handlePublishProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.id;
    const product = await publishProduct(productId, artisan.id);
    return sendSuccess(res, { message: 'Product published successfully.', product });
  } catch (err: any) {
    if (err.code === 'PUBLISH_VALIDATION_FAILED') {
      return sendError(res, err.code, err.message, 400);
    }
    next(err);
  }
}

export async function handleArchiveProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.id;
    const product = await archiveProduct(productId, artisan.id);
    return sendSuccess(res, { message: 'Product archived successfully.', product });
  } catch (err) {
    next(err);
  }
}

export async function handleGetProductStats(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const stats = await getProductStats(artisan.id);
    return sendSuccess(res, { stats });
  } catch (err) {
    next(err);
  }
}

export async function handleUploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.id;
    if (!req.file) {
      return sendError(res, 'MISSING_FILE', 'Please select an image file to upload.', 400);
    }

    const variant = req.body.variant === 'enhanced' || req.body.imageVariant === 'enhanced' ? 'enhanced' : 'original';

    const imageUrl = await uploadProductImage(
      artisan.id,
      productId,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      variant
    );

    return sendSuccess(res, { message: 'Image uploaded successfully.', imageUrl, variant });
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

    const productId = req.params.id;
    const backgroundOption = (req.body.backgroundOption || req.body.background_option || 'WHITE') as string;
    const colorHex = (req.body.colorHex || req.body.color_hex) as string | undefined;

    const result = await enhanceExistingProduct(artisan.id, productId, backgroundOption, colorHex);

    if (!result.success) {
      return sendError(res, 'ENHANCEMENT_FAILED', result.message || 'Image enhancement could not be completed safely. Your original image is unchanged.', 422);
    }

    return sendSuccess(res, {
      message: result.message || 'Product photo enhanced successfully.',
      enhancedImageUrl: result.enhancedImageUrl,
      enhancedImageBase64: result.enhancedImageBase64,
      originalImageUrl: result.originalImageUrl,
      background: backgroundOption,
      improvementsApplied: result.improvementsApplied,
      adaptiveDetails: (result as any).adaptiveDetails,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleSelectProductImageVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const artisan = req.artisan;
    if (!artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const productId = req.params.id;
    const variant = req.body.variant === 'enhanced' ? 'enhanced' : 'original';

    const updatedProduct = await selectProductImageVariant(artisan.id, productId, variant);

    return sendSuccess(res, {
      message: `Active product photo set to ${variant} image.`,
      product: updatedProduct,
      activeImageUrl: updatedProduct.primary_image_url,
      variant,
    });
  } catch (err) {
    next(err);
  }
}

