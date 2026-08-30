import { Request, Response, NextFunction } from 'express';
import { updateArtisanProfile } from '../services/artisan.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getProfile(req: Request, res: Response) {
  const artisan = req.artisan;
  if (!artisan) {
    return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
  }

  return sendSuccess(res, {
    artisan: {
      id: artisan.id,
      name: artisan.name,
      email: artisan.email,
      m63Id: artisan.m63_id,
      role: artisan.role,
      status: artisan.status,
      createdAt: artisan.created_at,
      updatedAt: artisan.updated_at,
    },
  });
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.artisan) {
      return sendError(res, 'UNAUTHORIZED', 'Artisan context not found.', 401);
    }

    const { name } = req.body;
    if (!name) {
      return sendError(res, 'NO_UPDATES', 'No valid updates provided.', 400);
    }

    const updatedArtisan = await updateArtisanProfile(req.user.id, { name });

    return sendSuccess(res, {
      message: 'Profile updated successfully.',
      artisan: {
        id: updatedArtisan.id,
        name: updatedArtisan.name,
        email: updatedArtisan.email,
        m63Id: updatedArtisan.m63_id,
        role: updatedArtisan.role,
        status: updatedArtisan.status,
        createdAt: updatedArtisan.created_at,
        updatedAt: updatedArtisan.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
}
