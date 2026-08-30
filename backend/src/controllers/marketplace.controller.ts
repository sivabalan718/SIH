import { Request, Response } from 'express';
import { getMarketplaceProducts, getMarketplaceProductById, MarketplaceFilterQuery } from '../services/marketplace.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function handleGetMarketplaceProducts(req: Request, res: Response): Promise<void> {
  try {
    const { search, category, craft_type, material, min_price, max_price, sort, limit, offset, lang } = req.query;

    const filter: MarketplaceFilterQuery = {
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      craft_type: craft_type ? String(craft_type) : undefined,
      material: material ? String(material) : undefined,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      sort: (sort as any) || 'recommended',
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    };

    const language = (lang as any) || 'en';
    const result = await getMarketplaceProducts(filter, language);

    sendSuccess(res, result);
  } catch (error: any) {
    logger.error('handleGetMarketplaceProducts failed:', error);
    sendError(res, 'MARKETPLACE_ERROR', error.message || 'Failed to retrieve marketplace products.', 500);
  }
}

export async function handleGetMarketplaceProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { lang } = req.query;
    const language = (lang as any) || 'en';

    const product = await getMarketplaceProductById(id, language);

    if (!product) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Product not found in marketplace or not published.', 404);
      return;
    }

    sendSuccess(res, { product });
  } catch (error: any) {
    logger.error('handleGetMarketplaceProductById failed:', error);
    sendError(res, 'PRODUCT_ERROR', error.message || 'Failed to retrieve product details.', 500);
  }
}
