import { Request, Response, NextFunction } from 'express';
import { registerArtisan, loginArtisan, refreshArtisanSession } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;
    const result = await registerArtisan(name, email, password);
    return sendSuccess(
      res,
      {
        message: 'M63 Artisan account registered successfully.',
        m63Id: result.m63Id,
        accessToken: result.session?.accessToken,
        refreshToken: result.session?.refreshToken,
        expiresIn: result.session?.expiresIn,
        artisan: {
          id: result.artisan.id,
          name: result.artisan.name,
          email: result.artisan.email,
          m63Id: result.artisan.m63_id,
          role: result.artisan.role,
          status: result.artisan.status,
          createdAt: result.artisan.created_at,
        },
      },
      201
    );
  } catch (err: any) {
    if (err.code === 'EMAIL_ALREADY_EXISTS') {
      return sendError(res, err.code, err.message, 409);
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { identifier, password } = req.body;
    const result = await loginArtisan(identifier, password);

    return sendSuccess(res, {
      message: 'Login successful.',
      accessToken: result.session.accessToken,
      refreshToken: result.session.refreshToken,
      expiresIn: result.session.expiresIn,
      artisan: {
        id: result.artisan.id,
        name: result.artisan.name,
        email: result.artisan.email,
        m63Id: result.artisan.m63_id,
        role: result.artisan.role,
        status: result.artisan.status,
        createdAt: result.artisan.created_at,
      },
    });
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') {
      return sendError(res, err.code, err.message, 401);
    }
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    const result = await refreshArtisanSession(refreshToken);

    return sendSuccess(res, {
      message: 'Session refreshed successfully.',
      accessToken: result.session.accessToken,
      refreshToken: result.session.refreshToken,
      expiresIn: result.session.expiresIn,
      artisan: {
        id: result.artisan.id,
        name: result.artisan.name,
        email: result.artisan.email,
        m63Id: result.artisan.m63_id,
        role: result.artisan.role,
        status: result.artisan.status,
        createdAt: result.artisan.created_at,
      },
    });
  } catch (err: any) {
    return sendError(res, 'SESSION_EXPIRED', err.message || 'Session expired. Please log in again.', 401);
  }
}

export async function logout(req: Request, res: Response) {
  return sendSuccess(res, { message: 'Logged out successfully.' });
}

export async function getMe(req: Request, res: Response) {
  const artisan = req.artisan;
  if (!artisan) {
    return sendError(res, 'UNAUTHORIZED', 'Not authenticated.', 401);
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
    },
  });
}
