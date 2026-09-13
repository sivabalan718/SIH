import { Request, Response, NextFunction } from 'express';
import { registerArtisan, loginArtisan, refreshArtisanSession, registerCustomer, loginCustomer } from '../services/auth.service.js';
import { getCustomerProfile, updateCustomerProfile, createCustomerProfile } from '../services/customer.service.js';
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
  const artisan = (req as any).artisan;
  const customer = (req as any).customer;

  if (artisan) {
    return sendSuccess(res, {
      artisan: {
        id: artisan.id,
        name: artisan.name,
        email: artisan.email,
        m63Id: artisan.m63_id,
        role: 'ARTISAN',
        status: artisan.status,
        createdAt: artisan.created_at,
      },
      user: {
        id: artisan.id,
        name: artisan.name,
        email: artisan.email,
        m63Id: artisan.m63_id,
        role: 'ARTISAN',
      },
    });
  }

  if (customer) {
    return sendSuccess(res, {
      customer,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        role: 'CUSTOMER',
        address: customer.address,
        locality: customer.locality,
        city: customer.city,
        district: customer.district,
        state: customer.state,
        postalCode: customer.postal_code,
        country: customer.country,
        preferredLanguage: customer.preferred_language,
      },
    });
  }

  // Fallback check user metadata
  const user = req.user;
  if (user) {
    return sendSuccess(res, {
      user: {
        id: user.id,
        name: user.user_metadata?.name || 'M63 User',
        email: user.email,
        role: user.user_metadata?.role || 'CUSTOMER',
      },
    });
  }

  return sendError(res, 'UNAUTHORIZED', 'Not authenticated.', 401);
}

export async function registerCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, mobile, address, locality, city, district, state, postalCode, preferredLanguage } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Name, email, and password are required.', 400);
    }

    const result = await registerCustomer({
      name,
      email,
      password,
      mobile,
      address,
      locality,
      city,
      district,
      state,
      postal_code: postalCode,
      preferred_language: preferredLanguage,
    });

    return sendSuccess(
      res,
      {
        message: 'Customer registered successfully.',
        accessToken: result.session?.accessToken,
        refreshToken: result.session?.refreshToken,
        expiresIn: result.session?.expiresIn,
        customer: result.customer,
        user: {
          id: result.customer.id,
          name: result.customer.name,
          email: result.customer.email,
          mobile: result.customer.mobile,
          role: 'CUSTOMER',
          address: result.customer.address,
          locality: result.customer.locality,
          city: result.customer.city,
          district: result.customer.district,
          state: result.customer.state,
          postalCode: result.customer.postal_code,
          preferredLanguage: result.customer.preferred_language,
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

export async function loginCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Email and password are required.', 400);
    }

    const result = await loginCustomer(email, password);

    return sendSuccess(res, {
      message: 'Customer login successful.',
      accessToken: result.session.accessToken,
      refreshToken: result.session.refreshToken,
      expiresIn: result.session.expiresIn,
      customer: result.customer,
      user: {
        id: result.customer.id,
        name: result.customer.name,
        email: result.customer.email,
        mobile: result.customer.mobile,
        role: 'CUSTOMER',
        address: result.customer.address,
        locality: result.customer.locality,
        city: result.customer.city,
        district: result.customer.district,
        state: result.customer.state,
        postalCode: result.customer.postal_code,
        preferredLanguage: result.customer.preferred_language,
      },
    });
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') {
      return sendError(res, err.code, err.message, 401);
    }
    next(err);
  }
}

export async function getCustomerProfileHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);

    const customer = await getCustomerProfile(user.id);
    if (!customer) {
      // Fallback create basic customer profile from user token
      const newCust = await createCustomerProfile(user.id, {
        name: user.user_metadata?.name || 'M63 Customer',
        email: user.email || '',
      });
      return sendSuccess(res, { customer: newCust });
    }

    return sendSuccess(res, { customer });
  } catch (err: any) {
    return sendError(res, 'PROFILE_ERROR', err.message || 'Failed to fetch customer profile.', 500);
  }
}

export async function updateCustomerProfileHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);

    const { name, mobile, address, locality, city, district, state, postalCode, preferredLanguage } = req.body;

    const updated = await updateCustomerProfile(user.id, {
      name,
      mobile,
      address,
      locality,
      city,
      district,
      state,
      postal_code: postalCode,
      preferred_language: preferredLanguage,
    });

    return sendSuccess(res, { customer: updated, message: 'Customer profile updated successfully.' });
  } catch (err: any) {
    return sendError(res, 'UPDATE_PROFILE_ERROR', err.message || 'Failed to update customer profile.', 500);
  }
}

