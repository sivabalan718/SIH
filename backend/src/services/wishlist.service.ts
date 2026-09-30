import { getSupabaseAdmin } from '../config/supabase.js';

const httpError = (message: string, statusCode: number) => Object.assign(new Error(message), { statusCode });
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Wishlist saved to the customer's account (works across devices). */
export async function getWishlist(buyerId: string): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('wishlists')
    .select('product_id')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) throw httpError('Wishlist is not available yet.', 503);
  return (data || []).map((r: any) => r.product_id);
}

export async function addToWishlist(buyerId: string, productId: string): Promise<string[]> {
  if (!ID_RE.test(productId)) throw httpError('Invalid product.', 400);
  const { error } = await getSupabaseAdmin().from('wishlists').upsert({ buyer_id: buyerId, product_id: productId }, { onConflict: 'buyer_id,product_id' });
  if (error) throw httpError('Could not save to your wishlist.', 503);
  return getWishlist(buyerId);
}

export async function removeFromWishlist(buyerId: string, productId: string): Promise<string[]> {
  await getSupabaseAdmin().from('wishlists').delete().eq('buyer_id', buyerId).eq('product_id', productId);
  return getWishlist(buyerId);
}

/** Merge items saved on this device before signing in (max 200). */
export async function mergeWishlist(buyerId: string, productIds: unknown): Promise<string[]> {
  const ids = Array.isArray(productIds) ? productIds.filter((id): id is string => typeof id === 'string' && ID_RE.test(id)).slice(0, 200) : [];
  if (ids.length) {
    const { error } = await getSupabaseAdmin()
      .from('wishlists')
      .upsert(ids.map((product_id) => ({ buyer_id: buyerId, product_id })), { onConflict: 'buyer_id,product_id', ignoreDuplicates: true });
    if (error) throw httpError('Could not sync your wishlist.', 503);
  }
  return getWishlist(buyerId);
}
