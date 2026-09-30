import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { notify } from './notification.service.js';
import { refundPayment } from './payment.service.js';

/**
 * Refund / replacement requests after delivery.
 * Customer raises (within the return window) → artisan approves / rejects → artisan completes.
 * Completing an approved REFUND on a paid online order issues a real Razorpay refund.
 */

export const RETURN_WINDOW_DAYS = 7;
export type RequestType = 'REFUND' | 'REPLACEMENT';
export type RequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export const REQUEST_REASONS = [
  'Item arrived damaged',
  'Wrong item received',
  'Item is different from the description',
  'Missing parts or pieces',
  'Quality issue',
  'Other',
] as const;

const httpError = (message: string, statusCode: number, code?: string) => Object.assign(new Error(message), { statusCode, code });

async function loadOrder(orderId: string) {
  const { data } = await getSupabaseAdmin().from('orders').select('*').eq('id', orderId).maybeSingle();
  return data;
}

export async function createOrderRequest(
  buyerId: string,
  orderId: string,
  input: { type?: string; reason?: string; details?: string; photo_urls?: unknown }
) {
  const order = await loadOrder(orderId);
  if (!order) throw httpError('Order not found.', 404);
  if (order.buyer_id !== buyerId) throw httpError('You do not have access to this order.', 403);
  if (order.status !== 'DELIVERED') throw httpError('Returns and replacements can be requested after the order is delivered.', 400);
  const deliveredAt = new Date(order.delivered_at || order.updated_at).getTime();
  if (Date.now() - deliveredAt > RETURN_WINDOW_DAYS * 86400000) {
    throw httpError(`The ${RETURN_WINDOW_DAYS}-day return window for this order has closed.`, 400, 'WINDOW_CLOSED');
  }
  if (input.type !== 'REFUND' && input.type !== 'REPLACEMENT') throw httpError('Choose refund or replacement.', 400);
  if (!input.reason || !(REQUEST_REASONS as readonly string[]).includes(input.reason)) throw httpError('Choose a reason.', 400);
  const details = String(input.details || '').trim().slice(0, 1000);
  if (input.reason === 'Other' && details.length < 10) throw httpError('Please describe the problem.', 400);
  const photos = Array.isArray(input.photo_urls) ? input.photo_urls.filter(isOurPhotoUrl).slice(0, 3) : [];

  const { data, error } = await getSupabaseAdmin()
    .from('order_requests')
    .insert({ order_id: orderId, buyer_id: buyerId, artisan_id: order.artisan_id, type: input.type, reason: input.reason, details, photo_urls: photos })
    .select()
    .single();
  if (error) {
    if (/duplicate key|uq_order_requests_open/i.test(error.message)) throw httpError('There is already an open request for this order.', 409);
    throw httpError('Could not submit your request. Please try again.', 500);
  }

  notify({
    recipientId: order.artisan_id,
    role: 'ARTISAN',
    type: 'REQUEST_NEW',
    category: 'order',
    title: `${input.type === 'REFUND' ? 'Refund' : 'Replacement'} request for ${order.m63_order_number}`,
    body: input.reason,
    link: '/artisan/orders',
    dedupeKey: `request:${data.id}:new`,
  });
  return data;
}

export async function listBuyerRequests(buyerId: string) {
  const { data, error } = await getSupabaseAdmin().from('order_requests').select('*').eq('buyer_id', buyerId).order('created_at', { ascending: false });
  if (error) throw httpError('Requests are not available yet.', 503);
  return data || [];
}

export async function listArtisanRequests(artisanId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('order_requests')
    .select('*, orders(m63_order_number, total_amount, payment_method, payment_status, shipping_name)')
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false });
  if (error) throw httpError('Requests are not available yet.', 503);
  return data || [];
}

const NEXT: Record<string, { from: RequestStatus[]; to: RequestStatus }> = {
  APPROVE: { from: ['REQUESTED'], to: 'APPROVED' },
  REJECT: { from: ['REQUESTED'], to: 'REJECTED' },
  COMPLETE: { from: ['APPROVED'], to: 'COMPLETED' },
};

export async function updateOrderRequest(artisanId: string, requestId: string, action: string, note?: string) {
  const step = NEXT[action];
  if (!step) throw httpError('Unknown action.', 400);
  const supabase = getSupabaseAdmin();
  const { data: req } = await supabase.from('order_requests').select('*').eq('id', requestId).maybeSingle();
  if (!req || req.artisan_id !== artisanId) throw httpError('Request not found.', 404);
  if (!step.from.includes(req.status)) throw httpError(`This request is already ${req.status.toLowerCase()}.`, 400);
  const cleanNote = String(note || '').trim().slice(0, 500);
  if (action === 'REJECT' && cleanNote.length < 5) throw httpError('Please tell the customer why the request is rejected.', 400);

  const order = await loadOrder(req.order_id);
  const update: Record<string, any> = { status: step.to, artisan_note: cleanNote || req.artisan_note || null };

  // Completing an approved refund on a paid online order refunds the money through Razorpay.
  if (action === 'COMPLETE' && req.type === 'REFUND' && order?.payment_method === 'ONLINE' && order?.payment_status === 'PAID' && order?.razorpay_payment_id) {
    const amountPaise = Math.round(Number(order.total_amount) * 100);
    const refund = await refundPayment(order.razorpay_payment_id, amountPaise, { m63_order: order.m63_order_number, m63_request: req.id });
    update.refund_id = refund.id;
    update.refund_amount = refund.amount / 100;
    logger.info(`[Requests] Refund ${refund.id} issued for ${order.m63_order_number}`);
  } else if (action === 'COMPLETE' && req.type === 'REFUND' && order) {
    update.refund_amount = Number(order.total_amount); // Cash on delivery: refunded directly by the artisan
  }
  if (step.to === 'REJECTED' || step.to === 'COMPLETED') update.resolved_at = new Date().toISOString();

  const { data, error } = await supabase.from('order_requests').update(update).eq('id', requestId).eq('status', req.status).select().single();
  if (error || !data) throw httpError('Could not update the request. Please refresh and try again.', 409);

  const label = req.type === 'REFUND' ? 'Refund' : 'Replacement';
  const copy: Record<RequestStatus, string> = {
    REQUESTED: '',
    APPROVED: `${label} approved by the artisan.`,
    REJECTED: `${label} request was declined.`,
    COMPLETED: req.type === 'REFUND' ? 'Your refund has been processed.' : 'Your replacement has been sent.',
  };
  notify({
    recipientId: req.buyer_id,
    role: 'CUSTOMER',
    type: `REQUEST_${step.to}`,
    category: 'order',
    title: `${copy[step.to]}${order ? ` (${order.m63_order_number})` : ''}`,
    body: cleanNote || (update.refund_amount ? `Amount: ₹${Number(update.refund_amount).toLocaleString('en-IN')}` : ''),
    link: `/marketplace/orders/${req.order_id}`,
    dedupeKey: `request:${req.id}:${step.to}`,
  });
  return data;
}

/** Customer photos must be files uploaded through M63 (our Cloudinary account). */
export function isOurPhotoUrl(u: unknown): u is string {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return typeof u === 'string' && Boolean(cloud) && u.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`) && u.length < 400;
}
