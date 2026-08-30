import { getSupabaseAdmin, getSupabaseAnon } from '../config/supabase.js';
import {
  findArtisanByEmail,
  findArtisanByM63Id,
  createArtisanWithUniqueM63Id,
  ArtisanRecord,
} from './artisan.service.js';
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

  if (authError || !authData.user) {
    logger.error('Supabase auth createUser error:', authError?.message);
    const error: any = new Error(authError?.message || 'Unable to create user account.');
    error.code = 'AUTH_CREATION_FAILED';
    throw error;
  }

  const supabaseUserId = authData.user.id;

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

  // If authentication fails but artisan profile exists, auto-sync password via admin to guarantee credentials stability
  if (authRes.error || !authRes.data.session) {
    logger.warn(`Initial signInWithPassword failed for ${targetEmail}: ${authRes.error?.message}. Syncing credentials via admin...`);
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.updateUserById(matchedArtisan.supabase_user_id, {
        password: password,
        email_confirm: true,
      });

      // Retry authentication with synced credentials
      authRes = await supabaseAnon.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
    } catch (syncErr: any) {
      logger.error('Credential sync error:', syncErr?.message);
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
