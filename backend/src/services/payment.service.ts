import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getBuyerOrderById, getOrdersByCheckoutGroup, ONLINE_PAYMENT_WINDOW_MS, OrderRecord } from './order.service.js';

/**
 * Razorpay Standard Checkout — server side.
 * The payable amount always comes from M63 orders in the database; the browser only sends
 * an order reference. An order becomes PAID only after HMAC signature verification.
 */

const httpError = (message: string, statusCode: number, code?: string) => Object.assign(new Error(message), { statusCode, code });

let client: Razorpay | null = null;

export function isPaymentsConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

function getRazorpay(): Razorpay {
  if (!isPaymentsConfigured()) {
    throw httpError('Online payments are not configured yet. Please choose Cash on Delivery.', 503, 'PAYMENTS_NOT_CONFIGURED');
  }
  if (!client) client = new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  return client;
}

/** Constant-time comparison of hex signatures. */
function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function computePaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, secret = env.razorpayKeySecret): string {
  return crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
}

/** Load the M63 orders being paid (one checkout can hold one order per artisan) and verify ownership. */
async function loadPayableOrders(buyerId: string, ref: { orderId?: string; checkoutGroupId?: string }): Promise<OrderRecord[]> {
  const supabase = getSupabaseAdmin();
  let groupId = ref.checkoutGroupId;
  if (!groupId && ref.orderId) {
    const { data } = await supabase.from('orders').select('id, buyer_id, checkout_group_id').eq('id', ref.orderId).maybeSingle();
    if (!data) throw httpError('Order not found.', 404, 'ORDER_NOT_FOUND');
    if (data.buyer_id !== buyerId) throw httpError('You do not have access to this order.', 403, 'FORBIDDEN');
    groupId = data.checkout_group_id || undefined;
    if (!groupId) {
      const single = await getBuyerOrderById(buyerId, ref.orderId);
      if (!single) throw httpError('Order not found.', 404, 'ORDER_NOT_FOUND');
      return [single];
    }
  }
  if (!groupId) throw httpError('An order reference is required.', 400, 'VALIDATION_ERROR');

  const orders = await getOrdersByCheckoutGroup(groupId);
  if (orders.length === 0) throw httpError('Order not found.', 404, 'ORDER_NOT_FOUND');
  if (orders.some((o) => o.buyer_id !== buyerId)) throw httpError('You do not have access to this order.', 403, 'FORBIDDEN');
  return orders;
}

function assertPayable(orders: OrderRecord[]) {
  if (orders.every((o) => o.payment_status === 'PAID')) throw httpError('This order is already paid.', 409, 'ALREADY_PAID');
  for (const o of orders) {
    if (o.status === 'CANCELLED') throw httpError('This order was cancelled and can no longer be paid. Please place a new order.', 400, 'ORDER_CANCELLED');
    if (o.payment_method !== 'ONLINE') throw httpError('This order is not an online-payment order.', 400, 'NOT_PAYABLE');
    if (Date.now() - new Date(o.placed_at).getTime() > ONLINE_PAYMENT_WINDOW_MS) {
      throw httpError('The payment window for this order has expired. Please place the order again.', 400, 'PAYMENT_WINDOW_EXPIRED');
    }
  }
}

export interface CreatePaymentResult {
  order_id: string;
  amount: number;
  currency: 'INR';
  key_id: string;
  checkout_group_id: string;
  m63_order_numbers: string[];
}

/** Create (or safely reuse) the Razorpay order for an M63 checkout. */
export async function createPaymentOrder(
  buyerId: string,
  ref: { orderId?: string; checkoutGroupId?: string }
): Promise<CreatePaymentResult> {
  const orders = await loadPayableOrders(buyerId, ref);
  assertPayable(orders);

  // Authoritative amount from the database, in paise
  const amountPaise = Math.round(orders.reduce((sum, o) => sum + Number(o.total_amount), 0) * 100);
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw httpError('The payable amount must be at least ₹1.', 400, 'AMOUNT_TOO_LOW');
  }

  const razorpay = getRazorpay();
  const groupId = orders[0].checkout_group_id || orders[0].id;

  // Reuse an existing unpaid Razorpay order for the same amount (retry / double click)
  const existingId = orders[0].razorpay_order_id;
  if (existingId && orders.every((o) => o.razorpay_order_id === existingId)) {
    try {
      const existing: any = await razorpay.orders.fetch(existingId);
      if (Number(existing.amount) === amountPaise && existing.status !== 'paid') {
        return {
          order_id: existingId,
          amount: amountPaise,
          currency: 'INR',
          key_id: env.razorpayKeyId,
          checkout_group_id: groupId,
          m63_order_numbers: orders.map((o) => o.m63_order_number),
        };
      }
    } catch (e: any) {
      logger.warn(`[Payments] Could not reuse Razorpay order ${existingId}: ${e?.error?.description || e?.message}`);
    }
  }

  let rzpOrder: any;
  try {
    rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `m63_${groupId}`.slice(0, 40),
      notes: { m63_checkout_group: groupId, m63_orders: orders.map((o) => o.m63_order_number).join(',') },
    });
  } catch (e: any) {
    logger.error(`[Payments] Razorpay order creation failed: ${e?.error?.description || e?.message}`);
    throw httpError('The payment service is unavailable right now. Please try again in a moment.', 502, 'PAYMENT_PROVIDER_ERROR');
  }

  const { error } = await getSupabaseAdmin()
    .from('orders')
    .update({ razorpay_order_id: rzpOrder.id, payment_status: 'PENDING', payment_failure_reason: null })
    .in('id', orders.map((o) => o.id))
    .neq('payment_status', 'PAID');
  if (error) throw httpError('Could not link the payment to your order. Please try again.', 500);

  logger.info(`[Payments] Razorpay order ${rzpOrder.id} created for ${groupId} (${amountPaise} paise)`);
  return {
    order_id: rzpOrder.id,
    amount: amountPaise,
    currency: 'INR',
    key_id: env.razorpayKeyId,
    checkout_group_id: groupId,
    m63_order_numbers: orders.map((o) => o.m63_order_number),
  };
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const RZP_ORDER_RE = /^order_[A-Za-z0-9]{6,40}$/;
const RZP_PAYMENT_RE = /^pay_[A-Za-z0-9]{6,40}$/;
const SIGNATURE_RE = /^[a-f0-9]{64}$/;

/** Verify the checkout signature, then mark the linked M63 orders PAID (idempotent). */
export async function verifyPayment(buyerId: string, input: VerifyPaymentInput): Promise<{ orders: Array<{ id: string; m63_order_number: string }>; already_processed: boolean }> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input || ({} as VerifyPaymentInput);
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw httpError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required.', 400, 'VALIDATION_ERROR');
  }
  if (!RZP_ORDER_RE.test(razorpay_order_id) || !RZP_PAYMENT_RE.test(razorpay_payment_id) || !SIGNATURE_RE.test(razorpay_signature)) {
    throw httpError('Invalid payment details.', 400, 'VALIDATION_ERROR');
  }
  if (!isPaymentsConfigured()) throw httpError('Online payments are not configured.', 503, 'PAYMENTS_NOT_CONFIGURED');

  const expected = computePaymentSignature(razorpay_order_id, razorpay_payment_id);
  if (!safeEqualHex(expected, razorpay_signature)) {
    logger.warn(`[Payments] Signature mismatch for ${razorpay_order_id}`);
    throw httpError('Payment verification failed. You have not been charged for an unverified order.', 400, 'INVALID_SIGNATURE');
  }

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase.from('orders').select('*, order_items(*)').eq('razorpay_order_id', razorpay_order_id);
  if (!rows || rows.length === 0) throw httpError('This payment does not match any M63 order.', 400, 'ORDER_MISMATCH');
  if (rows.some((o: any) => o.buyer_id !== buyerId)) throw httpError('You do not have access to this order.', 403, 'FORBIDDEN');

  // Already processed (duplicate verify call / webhook got there first)
  if (rows.every((o: any) => o.payment_status === 'PAID')) {
    if (rows.every((o: any) => o.razorpay_payment_id === razorpay_payment_id)) {
      return { orders: rows.map((o: any) => ({ id: o.id, m63_order_number: o.m63_order_number })), already_processed: true };
    }
    throw httpError('This order was already paid with a different payment.', 409, 'ALREADY_PAID');
  }

  // Defence in depth: confirm with Razorpay that the payment belongs to this order and amount.
  const expectedPaise = Math.round(rows.reduce((s: number, o: any) => s + Number(o.total_amount), 0) * 100);
  try {
    const payment: any = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || Number(payment.amount) !== expectedPaise) {
      throw httpError('Payment details do not match this order.', 400, 'ORDER_MISMATCH');
    }
    if (payment.status === 'authorized') {
      await getRazorpay().payments.capture(razorpay_payment_id, expectedPaise, 'INR');
    } else if (payment.status !== 'captured') {
      throw httpError(`Payment is ${payment.status}. Please try again.`, 400, 'PAYMENT_NOT_CAPTURED');
    }
  } catch (e: any) {
    if (e instanceof Error && (e as any).statusCode) throw e; // our own validation errors
    if (e?.statusCode && e.statusCode < 500) {
      // Razorpay answered and rejected the payment reference (e.g. unknown payment id)
      throw httpError('This payment could not be confirmed with Razorpay.', 400, 'PAYMENT_NOT_CONFIRMED');
    }
    // Provider unreachable: the valid signature alone is Razorpay's documented proof of payment.
    logger.warn(`[Payments] Could not cross-check payment ${razorpay_payment_id}: ${e?.error?.description || e?.message}`);
  }

  const paidAt = new Date().toISOString();
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'PAID', razorpay_payment_id, paid_at: paidAt, payment_failure_reason: null })
    .eq('razorpay_order_id', razorpay_order_id)
    .neq('payment_status', 'PAID');
  if (error) throw httpError('Payment received but the order could not be updated. Our team will reconcile it.', 500, 'ORDER_UPDATE_FAILED');

  logger.info(`[Payments] Verified ${razorpay_payment_id} for ${razorpay_order_id}`);
  return { orders: rows.map((o: any) => ({ id: o.id, m63_order_number: o.m63_order_number })), already_processed: false };
}

/** Record a failed/abandoned attempt (the order stays payable for a retry within the window). */
export async function recordPaymentFailure(buyerId: string, razorpayOrderId: string, reason?: string): Promise<void> {
  if (!RZP_ORDER_RE.test(razorpayOrderId || '')) throw httpError('Invalid payment reference.', 400, 'VALIDATION_ERROR');
  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase.from('orders').select('id, buyer_id').eq('razorpay_order_id', razorpayOrderId);
  if (!rows || rows.length === 0) throw httpError('Order not found.', 404, 'ORDER_NOT_FOUND');
  if (rows.some((o: any) => o.buyer_id !== buyerId)) throw httpError('You do not have access to this order.', 403, 'FORBIDDEN');
  await supabase
    .from('orders')
    .update({ payment_status: 'FAILED', payment_failure_reason: String(reason || 'Payment was not completed.').slice(0, 300) })
    .eq('razorpay_order_id', razorpayOrderId)
    .neq('payment_status', 'PAID');
}

/** Razorpay webhook (optional): authoritative server-to-server confirmation. */
export async function handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  if (!env.razorpayWebhookSecret) throw httpError('Webhook secret not configured.', 503);
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  if (!signature || !safeEqualHex(expected, signature)) throw httpError('Invalid webhook signature.', 400);

  const event = JSON.parse(rawBody.toString('utf8'));
  const payment = event?.payload?.payment?.entity;
  const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
  if (!orderId) return;
  const supabase = getSupabaseAdmin();

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    await supabase
      .from('orders')
      .update({ payment_status: 'PAID', razorpay_payment_id: payment?.id, paid_at: new Date().toISOString(), payment_failure_reason: null })
      .eq('razorpay_order_id', orderId)
      .neq('payment_status', 'PAID');
  } else if (event.event === 'payment.failed') {
    await supabase
      .from('orders')
      .update({ payment_status: 'FAILED', payment_failure_reason: payment?.error_description || 'Payment failed.' })
      .eq('razorpay_order_id', orderId)
      .neq('payment_status', 'PAID');
  }
  logger.info(`[Payments] Webhook ${event.event} processed for ${orderId}`);
}
