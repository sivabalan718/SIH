import { apiRequest } from './api.js';

/**
 * Razorpay Standard Checkout — browser side.
 * The browser never decides the amount: it sends an M63 order reference, the backend returns
 * the Razorpay order (amount from the database) and later verifies the signature.
 */

export interface PaymentConfig {
  enabled: boolean;
  key_id: string | null;
  currency: 'INR';
}

export interface RazorpayOrderInfo {
  order_id: string;
  amount: number; // paise, computed by the backend
  currency: 'INR';
  key_id: string;
  checkout_group_id: string;
  m63_order_numbers: string[];
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  return apiRequest<PaymentConfig>('/payments/config', { method: 'GET' });
}

export async function createPaymentOrder(ref: { checkoutGroupId?: string; orderId?: string }): Promise<RazorpayOrderInfo> {
  return apiRequest<RazorpayOrderInfo>('/payments/create-order', { method: 'POST', body: JSON.stringify(ref) });
}

export async function verifyPayment(payload: RazorpaySuccess) {
  return apiRequest<{ verified: boolean; already_processed: boolean; orders: Array<{ id: string; m63_order_number: string }> }>(
    '/payments/verify',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export async function reportPaymentFailure(razorpay_order_id: string, reason: string) {
  return apiRequest('/payments/failed', { method: 'POST', body: JSON.stringify({ razorpay_order_id, reason }) }).catch(() => undefined);
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => {
        scriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

export type CheckoutOutcome =
  | { kind: 'success'; response: RazorpaySuccess }
  | { kind: 'dismissed' }
  | { kind: 'failed'; reason: string };

export type PaymentRunResult =
  | { status: 'paid'; orderNumbers: string[] }
  | { status: 'dismissed' | 'failed' | 'unverified'; message: string };

/**
 * Full client flow: backend creates the Razorpay order → modal → backend verifies signature.
 * Only a successful server verification counts as paid.
 */
export async function runPayment(
  ref: { checkoutGroupId?: string; orderId?: string },
  prefill: { name?: string; email?: string; contact?: string }
): Promise<PaymentRunResult> {
  const order = await createPaymentOrder(ref);
  const outcome = await openRazorpayCheckout(order, prefill);
  if (outcome.kind === 'dismissed') {
    return { status: 'dismissed', message: 'Payment was not completed. Your order is saved — you can pay within 30 minutes from Your Orders.' };
  }
  if (outcome.kind === 'failed') {
    await reportPaymentFailure(order.order_id, outcome.reason);
    return { status: 'failed', message: `${outcome.reason} No money was taken for this attempt — please try again.` };
  }
  try {
    const res = await verifyPayment(outcome.response);
    return { status: 'paid', orderNumbers: res.orders.map((o) => o.m63_order_number) };
  } catch (e: any) {
    return {
      status: 'unverified',
      message: e?.message || 'We could not confirm this payment yet. If money was debited, it will be reconciled automatically.',
    };
  }
}

/** Open the Razorpay modal and resolve with what the customer did. */
export async function openRazorpayCheckout(
  order: RazorpayOrderInfo,
  prefill: { name?: string; email?: string; contact?: string }
): Promise<CheckoutOutcome> {
  const ok = await loadRazorpayScript();
  if (!ok) return { kind: 'failed', reason: 'Could not load the payment window. Check your internet connection.' };

  return new Promise((resolve) => {
    let settled = false;
    let lastFailure: string | null = null;
    const done = (o: CheckoutOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };
    const rzp = new (window as any).Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'M63 Handmade',
      description: `Order ${order.m63_order_numbers.join(', ')}`,
      prefill,
      theme: { color: '#C85A28' },
      handler: (response: RazorpaySuccess) => done({ kind: 'success', response }),
      modal: {
        ondismiss: () => done(lastFailure ? { kind: 'failed', reason: lastFailure } : { kind: 'dismissed' }),
        confirm_close: true,
      },
      retry: { enabled: true },
    });
    // Razorpay keeps the modal open for retries; remember the reason in case the customer closes it.
    rzp.on('payment.failed', (resp: any) => {
      lastFailure = resp?.error?.description || 'Payment failed.';
    });
    rzp.open();
  });
}
