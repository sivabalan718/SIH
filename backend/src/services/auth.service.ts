import { getSupabaseAdmin, getSupabaseAnon } from '../config/supabase.js';
import {
  findArtisanByEmail,
  findArtisanByM63Id,
  createArtisanWithUniqueM63Id,
  ArtisanRecord,
} from './artisan.service.js';
import {
  createCustomerProfile,
  getCustomerProfile,
  updateCustomerProfile,
  CustomerRecord,
  CreateCustomerInput,
} from './customer.service.js';
import { isValidM63IdFormat } from './m63Id.service.js';
import { logger } from '../utils/logger.js';

export interface RegisterResult {
  m63Id: string;
  artisan: ArtisanRecord;
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface LoginResult {
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  artisan: ArtisanRecord;
}

/**
 * Register a new artisan account and automatically generate session tokens.
 */
export async function registerArtisan(
  name: string,
  email: string,
  password: string
): Promise<RegisterResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if artisan already exists in database
  const existingArtisan = await findArtisanByEmail(normalizedEmail);
  if (existingArtisan) {
    const error: any = new Error('An account with this email address already exists.');
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Create auth user in Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true, // Auto-confirm email so login works immediately
    user_metadata: { name: name.trim(), role: 'ARTISAN' },
  });

  let supabaseUserId: string;

  if (authError || !authData?.user) {
    const msg = authError?.message || '';
    const isAlreadyExists = msg.toLowerCase().includes('already') && (msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('exists'));

    if (isAlreadyExists) {
      // The email already has an account (e.g. a customer). An artisan workspace may be attached
      // ONLY after proving ownership with the account's current password — never overwrite it.
      const { data: signIn, error: signInError } = await getSupabaseAnon().auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!signInError && signIn?.user) {
        supabaseUserId = signIn.user.id;
        logger.info(`[AuthService] Attaching artisan workspace to existing account ${supabaseUserId} after password verification`);
        await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
          user_metadata: { ...signIn.user.user_metadata, has_artisan_account: true },
        });
      } else {
        const error: any = new Error('An account with this email already exists. Use that account’s password to add an artisan workspace, or use a different email.');
        error.code = 'EMAIL_ALREADY_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    } else {
      logger.error('Supabase auth createUser error:', authError?.message);
      const error: any = new Error(authError?.message || 'Unable to create user account.');
      error.code = 'AUTH_CREATION_FAILED';
      error.statusCode = 400;
      throw error;
    }
  } else {
    supabaseUserId = authData.user.id;
  }

  // 2. Create Artisan record with unique M63 ID
  try {
    const artisanRecord = await createArtisanWithUniqueM63Id(supabaseUserId, name, normalizedEmail);

    // 3. Auto-login to obtain session tokens (accessToken & refreshToken) immediately
    let sessionData;
    try {
      const loginRes = await loginArtisan(normalizedEmail, password);
      sessionData = loginRes.session;
    } catch (e) {
      logger.warn('Auto-login after registration deferred; session can be initiated on login.');
    }

    return {
      m63Id: artisanRecord.m63_id,
      artisan: artisanRecord,
      session: sessionData,
    };
  } catch (err: any) {
    logger.error('Failed to create artisan record, cleaning up auth user...', err.message);
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    throw err;
  }
}

/**
 * Authenticate artisan using Email or M63 ID with persistent credentials guarantee.
 */
export async function loginArtisan(
  identifier: string,
  password: string
): Promise<LoginResult> {
  const cleanIdentifier = identifier.trim();
  let targetEmail = cleanIdentifier.toLowerCase();
  let matchedArtisan: ArtisanRecord | null = null;

  // Check if identifier is M63 ID (e.g. M63-MOMAOV or m63-momaov)
  if (isValidM63IdFormat(cleanIdentifier)) {
    matchedArtisan = await findArtisanByM63Id(cleanIdentifier.toUpperCase());
    if (matchedArtisan) {
      targetEmail = matchedArtisan.email.toLowerCase();
    }
  }

  // If not matched by M63 ID, check by email
  if (!matchedArtisan) {
    matchedArtisan = await findArtisanByEmail(targetEmail);
  }

  if (!matchedArtisan) {
    logger.warn(`Login failed: No artisan account found for identifier "${cleanIdentifier}"`);
    const customError: any = new Error('Invalid email or M63 ID or password.');
    customError.code = 'INVALID_CREDENTIALS';
    throw customError;
  }

  const supabaseAnon = getSupabaseAnon();

  // Attempt standard password authentication via Supabase Auth
  let authRes = await supabaseAnon.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  // SECURITY: a wrong password must fail. (Previously the typed password was written over the
  // account's password, letting anyone who knew an email / M63 ID sign in.) The only automatic
  // repair allowed is confirming an unconfirmed email — it never changes the password.
  if (authRes.error && /not confirmed/i.test(authRes.error.message || '')) {
    try {
      await getSupabaseAdmin().auth.admin.updateUserById(matchedArtisan.supabase_user_id, { email_confirm: true });
      authRes = await supabaseAnon.auth.signInWithPassword({ email: targetEmail, password });
    } catch (confirmErr: any) {
      logger.error('Email confirmation repair failed:', confirmErr?.message);
    }
  }

  if (authRes.error || !authRes.data.session || !authRes.data.user) {
    logger.warn(`Final authentication failed for ${cleanIdentifier}: ${authRes.error?.message}`);
    const customError: any = new Error('Invalid email or M63 ID or password.');
    customError.code = 'INVALID_CREDENTIALS';
    throw customError;
  }

  return {
    session: {
      accessToken: authRes.data.session.access_token,
      refreshToken: authRes.data.session.refresh_token,
      expiresIn: authRes.data.session.expires_in,
    },
    artisan: matchedArtisan,
  };
}

/**
 * Refresh an expired access token using a valid refreshToken.
 */
export async function refreshArtisanSession(refreshToken: string): Promise<LoginResult> {
  if (!refreshToken) {
    const error: any = new Error('Refresh token is required.');
    error.code = 'INVALID_REFRESH_TOKEN';
    throw error;
  }

  const supabaseAnon = getSupabaseAnon();
  const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    logger.warn('Supabase refreshSession failed:', error?.message);
    const customError: any = new Error('Your session has expired. Please log in again.');
    customError.code = 'SESSION_EXPIRED';
    throw customError;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: artisan, error: artisanErr } = await supabaseAdmin
    .from('artisans')
    .select('*')
    .eq('supabase_user_id', data.user.id)
    .single();

  if (artisanErr || !artisan) {
    logger.error('Artisan profile missing during session refresh:', data.user.id);
    const customError: any = new Error('Artisan profile record not found.');
    customError.code = 'PROFILE_NOT_FOUND';
    throw customError;
  }

  return {
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    },
    artisan: artisan as ArtisanRecord,
  };
}

export interface CustomerRegisterResult {
  customer: CustomerRecord;
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface CustomerLoginResult {
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  customer: CustomerRecord;
}

/**
 * Register a new customer account
 */
export async function registerCustomer(input: CreateCustomerInput & { password: string }): Promise<CustomerRegisterResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Create Auth user in Supabase
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name.trim(), role: 'CUSTOMER' },
  });

  let supabaseUserId: string;

  if (authError || !authData?.user) {
    const msg = authError?.message || '';
    const isAlreadyExists = msg.toLowerCase().includes('already') && (msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('exists'));

    if (isAlreadyExists) {
      // The email already has an account (e.g. an artisan). A customer profile may be attached
      // ONLY if the person proves they own it with the account's current password.
      // Never overwrite the existing password — that would allow account takeover.
      const { data: signIn, error: signInError } = await getSupabaseAnon().auth.signInWithPassword({
        email: normalizedEmail,
        password: input.password,
      });

      if (!signInError && signIn?.user) {
        supabaseUserId = signIn.user.id;
        logger.info(`[AuthService] Attaching customer profile to existing account ${supabaseUserId} after password verification`);
        await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
          user_metadata: { ...signIn.user.user_metadata, has_customer_account: true },
        });
      } else {
        const error: any = new Error(
          'An account with this email already exists. Sign in with that account’s password to add a customer profile, or use a different email.'
        );
        error.code = 'EMAIL_ALREADY_EXISTS';
        error.statusCode = 409;
        throw error;
      }
    } else {
      logger.error('Supabase auth createUser for customer error:', authError?.message);
      const error: any = new Error(authError?.message || 'Unable to create customer account.');
      error.code = 'AUTH_CREATION_FAILED';
      error.statusCode = 400;
      throw error;
    }
  } else {
    supabaseUserId = authData.user.id;
  }

  // 2. Create Customer Profile Record
  const customerRecord = await createCustomerProfile(supabaseUserId, {
    name: input.name,
    email: normalizedEmail,
    mobile: input.mobile,
    address: input.address,
    locality: input.locality,
    city: input.city,
    district: input.district,
    state: input.state,
    postal_code: input.postal_code,
    preferred_language: input.preferred_language,
  });

  // 3. Auto-login for session tokens
  let sessionData;
  try {
    const loginRes = await loginCustomer(normalizedEmail, input.password);
    sessionData = loginRes.session;
  } catch (e) {
    logger.warn('Auto-login for customer deferred; login manually.');
  }

  return {
    customer: customerRecord,
    session: sessionData,
  };
}

/**
 * Login Customer account
 */
export async function loginCustomer(email: string, password: string): Promise<CustomerLoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabaseAnon = getSupabaseAnon();

  const authRes = await supabaseAnon.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (authRes.error || !authRes.data.session || !authRes.data.user) {
    const customError: any = new Error('Invalid email or password.');
    customError.code = 'INVALID_CREDENTIALS';
    throw customError;
  }

  const userId = authRes.data.user.id;
  let customerRecord = await getCustomerProfile(userId);

  if (!customerRecord) {
    const nameFromMeta = authRes.data.user.user_metadata?.name || 'M63 Customer';
    customerRecord = await createCustomerProfile(userId, {
      name: nameFromMeta,
      email: normalizedEmail,
    });
  }

  return {
    session: {
      accessToken: authRes.data.session.access_token,
      refreshToken: authRes.data.session.refresh_token,
      expiresIn: authRes.data.session.expires_in,
    },
    customer: customerRecord,
  };
}

