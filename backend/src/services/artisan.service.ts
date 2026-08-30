import { getSupabaseAdmin } from '../config/supabase.js';
import { generateCandidateM63Id } from './m63Id.service.js';
import { logger } from '../utils/logger.js';

export interface ArtisanRecord {
  id: string;
  supabase_user_id: string;
  m63_id: string;
  name: string;
  email: string;
  role: 'ARTISAN' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export async function findArtisanByEmail(email: string): Promise<ArtisanRecord | null> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  
  const { data, error } = await supabase
    .from('artisans')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    logger.error('Error finding artisan by email:', error.message);
    throw new Error('Database error looking up artisan');
  }

  return data;
}

export async function findArtisanByM63Id(m63Id: string): Promise<ArtisanRecord | null> {
  const supabase = getSupabaseAdmin();
  const normalizedId = m63Id.trim().toUpperCase();

  const { data, error } = await supabase
    .from('artisans')
    .select('*')
    .eq('m63_id', normalizedId)
    .maybeSingle();

  if (error) {
    logger.error('Error finding artisan by M63 ID:', error.message);
    throw new Error('Database error looking up artisan by M63 ID');
  }

  return data;
}

export async function findArtisanBySupabaseUserId(supabaseUserId: string): Promise<ArtisanRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('artisans')
    .select('*')
    .eq('supabase_user_id', supabaseUserId)
    .maybeSingle();

  if (error) {
    logger.error('Error finding artisan by Supabase User ID:', error.message);
    throw new Error('Database error looking up artisan profile');
  }

  return data;
}

export async function createArtisanWithUniqueM63Id(
  supabaseUserId: string,
  name: string,
  email: string
): Promise<ArtisanRecord> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const candidateId = generateCandidateM63Id();

    const { data, error } = await supabase
      .from('artisans')
      .insert({
        supabase_user_id: supabaseUserId,
        m63_id: candidateId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'ARTISAN',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (!error && data) {
      logger.info(`Successfully created artisan record for ${normalizedEmail} with M63 ID: ${candidateId}`);
      return data as ArtisanRecord;
    }

    // Check if error is unique constraint violation on m63_id
    if (error && (error.code === '23505' || error.message.includes('m63_id'))) {
      logger.warn(`M63 ID collision on attempt ${attempt} (${candidateId}). Retrying...`);
      continue;
    }

    // If other error, throw
    logger.error('Failed to create artisan record:', error?.message);
    throw new Error(error?.message || 'Failed to create artisan record');
  }

  throw new Error('Failed to generate unique M63 ID after multiple attempts');
}

export async function updateArtisanProfile(
  supabaseUserId: string,
  updates: { name?: string }
): Promise<ArtisanRecord> {
  const supabase = getSupabaseAdmin();

  const allowedUpdates: Record<string, any> = {};
  if (updates.name !== undefined) {
    allowedUpdates.name = updates.name.trim();
  }

  const { data, error } = await supabase
    .from('artisans')
    .update(allowedUpdates)
    .eq('supabase_user_id', supabaseUserId)
    .select()
    .single();

  if (error || !data) {
    logger.error('Error updating artisan profile:', error?.message);
    throw new Error('Failed to update artisan profile');
  }

  return data as ArtisanRecord;
}
