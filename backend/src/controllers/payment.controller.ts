import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { createPaymentOrder, handleWebhook, isPaymentsConfigured, recordPaymentFailure, verifyPayment } from '../services/payment.service.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const fail = (res: Response, error: any, fallbackCode: string) => {
  const status = error?.statusCode || 500;
  // Never leak provider/internal details on 5xx
  const message = status >= 500 && status !== 503 && status !== 502 ? 'Payment service error. Please try again.' : error?.message;
  sendError(res, error?.code || fallbackCode, message || 'Payment request failed.', status);
};

/** Public: whether online payment is available, plus the public Key ID (never the secret). */
export function handlePaymentConfig(_req: Request, res: Response) {
  sendSuccess(res, { enabled: isPaymentsConfigured(), key_id: isPaymentsConfigured() ? env.razorpayKeyId : null, currency: 'INR' });
}

export async function handleCreatePaymentOrder(req: Request, res: Response) {
  try {
    const buyerId = req.user!.id;
    const { orderId, checkoutGroupId } = req.body || {};
    // Any client-supplied amount is deliberately ignored.
    const result = await createPaymentOrder(buyerId, {
      orderId: typeof orderId === 'string' ? orderId : undefined,
      checkoutGroupId: typeof checkoutGroupId === 'string' ? checkoutGroupId : undefined,
    });
    sendSuccess(res, result, 201);
  } catch (error: any) {
    logger.warn(`[Payments] create-order failed: ${error?.message}`);
    fail(res, error, 'CREATE_PAYMENT_FAILED');
  }
}

export async function handleVerifyPayment(req: Request, res: Response) {
  try {
    const result = await verifyPayment(req.user!.id, req.body);
    sendSuccess(res, { verified: true, ...result });
  } catch (error: any) {
    fail(res, error, 'PAYMENT_VERIFICATION_FAILED');
  }
}

export async function handlePaymentFailed(req: Request, res: Response) {
  try {
    await recordPaymentFailure(req.user!.id, req.body?.razorpay_order_id, req.body?.reason);
    sendSuccess(res, { recorded: true });
  } catch (error: any) {
    fail(res, error, 'PAYMENT_FAILURE_RECORD_FAILED');
  }
}

export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    await handleWebhook(req.body as Buffer, req.headers['x-razorpay-signature'] as string | undefined);
    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    logger.warn(`[Payments] Webhook rejected: ${error?.message}`);
    res.status(error?.statusCode || 400).json({ status: 'rejected' });
  }
}
