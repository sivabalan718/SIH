import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase.js';
import { findArtisanBySupabaseUserId } from '../services/artisan.service.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication token required.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid authentication header format.', 401);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      logger.warn('Failed to verify token with Supabase:', error?.message);
      return sendError(res, 'SESSION_EXPIRED', 'Your session has expired. Please log in again.', 401);
    }

    // Retrieve associated artisan profile
    const artisan = await findArtisanBySupabaseUserId(data.user.id);
    if (!artisan) {
      return sendError(res, 'ARTISAN_NOT_FOUND', 'No artisan workspace associated with this user.', 403);
    }

    if (artisan.status !== 'ACTIVE') {
      return sendError(res, 'ACCOUNT_INACTIVE', 'Your artisan account is currently inactive.', 403);
    }

    // Attach to request
    req.user = data.user;
    req.artisan = artisan;
    next();
  } catch (err: any) {
    logger.error('Error in requireAuth middleware:', err.message);
    return sendError(res, 'UNAUTHORIZED', 'Authentication verification failed.', 401);
  }
}
