import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export type PreferredLanguage = 'en' | 'ta' | 'hi';

export interface CustomerRecord {
  id: string; // Supabase user id
  name: string;
  email: string;
  mobile: string | null;
  role: 'CUSTOMER';
  address: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  preferred_language: PreferredLanguage;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  mobile?: string;
  address?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postal_code?: string;
  preferred_language?: PreferredLanguage;
}

export interface UpdateCustomerInput {
  name?: string;
  mobile?: string;
  address?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postal_code?: string;
  preferred_language?: PreferredLanguage;
}

// Local In-Memory Customer Store for fallback / dev resilience
const localCustomerMemoryStore = new Map<string, CustomerRecord>();

/**
 * Create or save customer profile
 */
export async function createCustomerProfile(
  userId: string,
  input: CreateCustomerInput
): Promise<CustomerRecord> {
  const now = new Date().toISOString();
  const record: CustomerRecord = {
    id: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile?.trim() || null,
    role: 'CUSTOMER',
    address: input.address?.trim() || null,
    locality: input.locality?.trim() || null,
    city: input.city?.trim() || null,
    district: input.district?.trim() || null,
    state: input.state?.trim() || null,
    postal_code: input.postal_code?.trim() || null,
    country: 'India',
    preferred_language: input.preferred_language || 'en',
    created_at: now,
    updated_at: now,
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('customer_profiles')
      .upsert(
        {
          id: userId,
          user_id: userId,
          name: record.name,
          email: record.email,
          mobile: record.mobile,
          address: record.address,
          locality: record.locality,
          city: record.city,
          district: record.district,
          state: record.state,
          postal_code: record.postal_code,
          country: record.country,
          preferred_language: record.preferred_language,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (!error && data) {
      logger.info(`[CustomerService] Saved customer profile to DB for user ${userId}`);
    }
  } catch (err: any) {
    logger.warn(`[CustomerService] Supabase customer_profiles notice (${err.message}); storing in local memory`);
  }

  localCustomerMemoryStore.set(userId, record);
  return record;
}

/**
 * Get customer profile by user ID
 */
export async function getCustomerProfile(userId: string): Promise<CustomerRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      return {
        id: data.id || data.user_id,
        name: data.name,
        email: data.email,
        mobile: data.mobile || null,
        role: 'CUSTOMER',
        address: data.address || null,
        locality: data.locality || null,
        city: data.city || null,
        district: data.district || null,
        state: data.state || null,
        postal_code: data.postal_code || null,
        country: data.country || 'India',
        preferred_language: data.preferred_language || 'en',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };
    }
  } catch (e) {}

  return localCustomerMemoryStore.get(userId) || null;
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(
  userId: string,
  input: UpdateCustomerInput
): Promise<CustomerRecord> {
  const existing = await getCustomerProfile(userId);
  const now = new Date().toISOString();

  const updated: CustomerRecord = {
    id: userId,
    name: input.name !== undefined ? input.name.trim() : existing?.name || 'M63 Customer',
    email: existing?.email || '',
    mobile: input.mobile !== undefined ? input.mobile.trim() : existing?.mobile || null,
    role: 'CUSTOMER',
    address: input.address !== undefined ? input.address.trim() : existing?.address || null,
    locality: input.locality !== undefined ? input.locality.trim() : existing?.locality || null,
    city: input.city !== undefined ? input.city.trim() : existing?.city || null,
    district: input.district !== undefined ? input.district.trim() : existing?.district || null,
    state: input.state !== undefined ? input.state.trim() : existing?.state || null,
    postal_code: input.postal_code !== undefined ? input.postal_code.trim() : existing?.postal_code || null,
    country: 'India',
    preferred_language: input.preferred_language || existing?.preferred_language || 'en',
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('customer_profiles')
      .upsert({
        id: userId,
        user_id: userId,
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        address: updated.address,
        locality: updated.locality,
        city: updated.city,
        district: updated.district,
        state: updated.state,
        postal_code: updated.postal_code,
        country: updated.country,
        preferred_language: updated.preferred_language,
        updated_at: now,
      });
  } catch (e) {}

  localCustomerMemoryStore.set(userId, updated);
  logger.info(`[CustomerService] Updated customer profile for user ${userId}`);
  return updated;
}
