import { Request, Response } from 'express';
import sharp from 'sharp';
import { z } from 'zod';
import { sendError, sendSuccess } from '../utils/response.js';
import { addToWishlist, getWishlist, mergeWishlist, removeFromWishlist } from '../services/wishlist.service.js';
import { getChannelStatus, getPreferences, listNotifications, markRead, savePreferences } from '../services/notification.service.js';
import { createOrderRequest, listArtisanRequests, listBuyerRequests, REQUEST_REASONS, RETURN_WINDOW_DAYS, updateOrderRequest } from '../services/order-request.service.js';
import { uploadToCloudinary } from '../services/cloudinary/cloudinary.service.js';
import { generateValidatedJson } from '../services/ai/gemini-json.service.js';

const fail = (res: Response, e: any, code: string) => sendError(res, e?.code || code, e?.message || 'Request failed.', e?.statusCode || 500);
const userId = (req: Request) => (req as any).user.id as string;
/** A signed-in person can hold both a customer account and an artisan workspace. */
const recipientIds = (req: Request) => [userId(req), (req as any).artisan?.id].filter(Boolean) as string[];

/* ------------------------------- Wishlist ------------------------------- */
export async function handleGetWishlist(req: Request, res: Response) {
  try {
    sendSuccess(res, { product_ids: await getWishlist(userId(req)) });
  } catch (e) {
    fail(res, e, 'WISHLIST_ERROR');
  }
}
export async function handleAddWishlist(req: Request, res: Response) {
  try {
    sendSuccess(res, { product_ids: await addToWishlist(userId(req), String(req.body?.productId || '')) });
  } catch (e) {
    fail(res, e, 'WISHLIST_ERROR');
  }
}
export async function handleRemoveWishlist(req: Request, res: Response) {
  try {
    sendSuccess(res, { product_ids: await removeFromWishlist(userId(req), req.params.productId) });
  } catch (e) {
    fail(res, e, 'WISHLIST_ERROR');
  }
}
export async function handleMergeWishlist(req: Request, res: Response) {
  try {
    sendSuccess(res, { product_ids: await mergeWishlist(userId(req), req.body?.productIds) });
  } catch (e) {
    fail(res, e, 'WISHLIST_ERROR');
  }
}

/* ----------------------------- Notifications ----------------------------- */
export async function handleListNotifications(req: Request, res: Response) {
  try {
    sendSuccess(res, await listNotifications(recipientIds(req), Number(req.query.limit) || 50));
  } catch (e) {
    fail(res, e, 'NOTIFICATIONS_ERROR');
  }
}
export async function handleMarkRead(req: Request, res: Response) {
  try {
    await markRead(recipientIds(req), req.params.id);
    sendSuccess(res, { ok: true });
  } catch (e) {
    fail(res, e, 'NOTIFICATIONS_ERROR');
  }
}
export async function handleMarkAllRead(req: Request, res: Response) {
  try {
    await markRead(recipientIds(req));
    sendSuccess(res, { ok: true });
  } catch (e) {
    fail(res, e, 'NOTIFICATIONS_ERROR');
  }
}
export async function handleGetPreferences(req: Request, res: Response) {
  sendSuccess(res, { preferences: await getPreferences(userId(req)), channels: getChannelStatus() });
}
export async function handleSavePreferences(req: Request, res: Response) {
  try {
    sendSuccess(res, { preferences: await savePreferences(userId(req), req.body || {}), channels: getChannelStatus() });
  } catch (e) {
    fail(res, e, 'PREFERENCES_ERROR');
  }
}

/* --------------------------- Customer photo upload --------------------------- */
export async function handleCustomerPhotoUpload(req: Request, res: Response) {
  try {
    if (!req.file) return sendError(res, 'VALIDATION_ERROR', 'Choose a photo to upload.', 400);
    // Re-encode (strips EXIF such as GPS location) and cap size before storing.
    const clean = await sharp(req.file.buffer, { failOn: 'none' }).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const up = await uploadToCloudinary(clean, `m63/customers/${userId(req)}/photos`);
    sendSuccess(res, { url: up.secureUrl }, 201);
  } catch (e: any) {
    sendError(res, 'UPLOAD_FAILED', /unconfigured/i.test(e?.message) ? 'Photo uploads are not available right now.' : 'Could not upload the photo.', 502);
  }
}

/* ---------------------------- Returns / replacements ---------------------------- */
export function handleRequestOptions(_req: Request, res: Response) {
  sendSuccess(res, { reasons: REQUEST_REASONS, window_days: RETURN_WINDOW_DAYS });
}
export async function handleCreateRequest(req: Request, res: Response) {
  try {
    sendSuccess(res, { request: await createOrderRequest(userId(req), req.params.id, req.body || {}) }, 201);
  } catch (e) {
    fail(res, e, 'REQUEST_ERROR');
  }
}
export async function handleMyRequests(req: Request, res: Response) {
  try {
    sendSuccess(res, { requests: await listBuyerRequests(userId(req)) });
  } catch (e) {
    fail(res, e, 'REQUEST_ERROR');
  }
}
export async function handleArtisanRequests(req: Request, res: Response) {
  try {
    sendSuccess(res, { requests: await listArtisanRequests((req as any).artisan.id) });
  } catch (e) {
    fail(res, e, 'REQUEST_ERROR');
  }
}
export async function handleUpdateRequest(req: Request, res: Response) {
  try {
    sendSuccess(res, { request: await updateOrderRequest((req as any).artisan.id, req.params.id, String(req.body?.action || ''), req.body?.note) });
  } catch (e) {
    fail(res, e, 'REQUEST_ERROR');
  }
}

/* ------------------------------ M63 AI: understanding ------------------------------ */
const querySchema = z.object({
  intent: z.enum(['SEARCH', 'ORDERS', 'OFFERS', 'TOP_RATED', 'PRODUCT_QUESTION', 'SIMILAR', 'HELP']),
  keywords: z.array(z.string().max(40)).max(8).default([]),
  category: z.string().max(60).nullable().optional(),
  material: z.string().max(60).nullable().optional(),
  min_price: z.number().nonnegative().nullable().optional(),
  max_price: z.number().nonnegative().nullable().optional(),
  in_stock_only: z.boolean().optional(),
});

/**
 * Gemini ONLY turns the shopper's words (English/Tamil/Hindi) into structured filters.
 * The app then searches real listings itself — Gemini never produces prices, stock or facts.
 */
export async function handleAssistantParse(req: Request, res: Response) {
  const query = String(req.body?.query || '').trim().slice(0, 300);
  if (!query) return sendError(res, 'VALIDATION_ERROR', 'Ask something.', 400);
  const categories = Array.isArray(req.body?.categories) ? req.body.categories.slice(0, 40).map((c: unknown) => String(c).slice(0, 60)) : [];
  const prompt = `You convert a shopper's message for an Indian handmade-products marketplace into search filters.
The message may be in English, Tamil or Hindi. Translate keywords to English.
Known categories: ${JSON.stringify(categories)}.
Return JSON only: {"intent": "SEARCH"|"ORDERS"|"OFFERS"|"TOP_RATED"|"PRODUCT_QUESTION"|"SIMILAR"|"HELP",
"keywords": [product words in English, max 5], "category": one known category or null, "material": string or null,
"min_price": number or null, "max_price": number or null, "in_stock_only": boolean}.
Do not invent products, prices or facts. Message: ${JSON.stringify(query)}`;
  const parsed = await generateValidatedJson(prompt, querySchema);
  sendSuccess(res, { parsed, source: parsed ? 'gemini' : 'unavailable' });
}
