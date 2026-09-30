import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * M63 notifications.
 * In-app notifications are stored in the database. SMS / WhatsApp go through provider adapters
 * that only send when their credentials are configured — nothing is faked or pretended.
 */

export type RecipientRole = 'CUSTOMER' | 'ARTISAN';
export type NotificationCategory = 'order' | 'product' | 'offer';

export interface NotificationInput {
  recipientId: string;
  role: RecipientRole;
  type: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
  /** Same key → delivered at most once per recipient */
  dedupeKey?: string;
  /** Optional phone number for SMS/WhatsApp (only used if the customer enabled it) */
  phone?: string | null;
}

export interface NotificationPreferences {
  order_updates: boolean;
  new_products: boolean;
  offers: boolean;
  sms: boolean;
  whatsapp: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = { order_updates: true, new_products: true, offers: true, sms: false, whatsapp: false };

/* ------------------------------ Provider adapters ------------------------------ */

interface MessageChannel {
  name: 'sms' | 'whatsapp';
  isConfigured(): boolean;
  send(to: string, text: string): Promise<void>;
}

/** MSG91 SMS (India, DLT-registered template required). Env: MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID */
const msg91Sms: MessageChannel = {
  name: 'sms',
  isConfigured: () => Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID && process.env.MSG91_TEMPLATE_ID),
  async send(to, text) {
    const res = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: process.env.MSG91_AUTH_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE_ID, sender: process.env.MSG91_SENDER_ID, recipients: [{ mobiles: `91${to}`, message: text }] }),
    });
    if (!res.ok) throw new Error(`MSG91 responded ${res.status}`);
  },
};

/** WhatsApp Cloud API (Meta). Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME */
const whatsappCloud: MessageChannel = {
  name: 'whatsapp',
  isConfigured: () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME),
  async send(to, text) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${to}`,
        type: 'template',
        template: { name: process.env.WHATSAPP_TEMPLATE_NAME, language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text }] }] },
      }),
    });
    if (!res.ok) throw new Error(`WhatsApp Cloud API responded ${res.status}`);
  },
};

const CHANNELS = [msg91Sms, whatsappCloud];

export function getChannelStatus() {
  return { in_app: true, sms: msg91Sms.isConfigured(), whatsapp: whatsappCloud.isConfigured() };
}

/* ------------------------------ Preferences ------------------------------ */

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data } = await getSupabaseAdmin().from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
    return data ? { ...DEFAULT_PREFS, ...data } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const clean: Partial<NotificationPreferences> = {};
  for (const k of Object.keys(DEFAULT_PREFS) as Array<keyof NotificationPreferences>) {
    if (typeof prefs[k] === 'boolean') clean[k] = prefs[k];
  }
  const { data, error } = await getSupabaseAdmin()
    .from('notification_preferences')
    .upsert({ user_id: userId, ...clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw Object.assign(new Error('Could not save your notification settings.'), { statusCode: 500 });
  return { ...DEFAULT_PREFS, ...data };
}

/* ------------------------------ Sending ------------------------------ */

const CATEGORY_PREF: Record<NotificationCategory, keyof NotificationPreferences> = {
  order: 'order_updates',
  product: 'new_products',
  offer: 'offers',
};

/** Create an in-app notification (respecting the customer's preferences) and fan out to enabled channels. */
export async function notify(input: NotificationInput): Promise<void> {
  try {
    const prefs = input.role === 'CUSTOMER' ? await getPreferences(input.recipientId) : DEFAULT_PREFS;
    // Order updates are always delivered in-app (they are about the customer's own purchase).
    if (input.category !== 'order' && !prefs[CATEGORY_PREF[input.category]]) return;

    const { error } = await getSupabaseAdmin()
      .from('notifications')
      .insert({
        recipient_id: input.recipientId,
        recipient_role: input.role,
        type: input.type,
        title: input.title.slice(0, 160),
        body: (input.body || '').slice(0, 600),
        link: input.link || null,
        data: input.data || {},
        dedupe_key: input.dedupeKey || null,
      });
    if (error) {
      if (!/duplicate key/i.test(error.message)) logger.warn(`[Notify] ${input.type} → ${input.recipientId}: ${error.message}`);
      return; // duplicate = already delivered
    }

    if (input.role === 'CUSTOMER' && input.phone && /^[6-9]\d{9}$/.test(input.phone)) {
      for (const ch of CHANNELS) {
        if (!prefs[ch.name] || !ch.isConfigured()) continue;
        ch.send(input.phone, `${input.title}. ${input.body || ''}`.trim()).catch((e) => logger.warn(`[Notify] ${ch.name} failed: ${e?.message}`));
      }
    }
  } catch (e: any) {
    logger.warn(`[Notify] ${input.type} failed: ${e?.message}`);
  }
}

/* ------------------------------ Inbox ------------------------------ */

export async function listNotifications(recipientIds: string[], limit = 50) {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .select('*')
    .in('recipient_id', recipientIds)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) throw Object.assign(new Error('Notifications are not available yet.'), { statusCode: 503 });
  const items = data || [];
  return { notifications: items, unread: items.filter((n: any) => !n.read_at).length };
}

export async function markRead(recipientIds: string[], id?: string) {
  let q = getSupabaseAdmin().from('notifications').update({ read_at: new Date().toISOString() }).in('recipient_id', recipientIds).is('read_at', null);
  if (id) q = q.eq('id', id);
  const { error } = await q;
  if (error) throw Object.assign(new Error('Could not update notifications.'), { statusCode: 500 });
}

/* ------------------------------ Event helpers ------------------------------ */

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export function notifyOrderPlaced(o: { id: string; m63_order_number: string; buyer_id: string; artisan_id: string; total_amount: number; payment_method: string | null; shipping_phone?: string }) {
  notify({
    recipientId: o.buyer_id,
    role: 'CUSTOMER',
    type: 'ORDER_PLACED',
    category: 'order',
    title: `Order ${o.m63_order_number} placed`,
    body: o.payment_method === 'COD' ? `Pay ${inr(o.total_amount)} on delivery.` : `Complete the payment of ${inr(o.total_amount)} to confirm it.`,
    link: `/marketplace/orders/${o.id}`,
    dedupeKey: `order:${o.id}:placed`,
    phone: o.shipping_phone,
  });
  if (o.payment_method === 'COD') notifyArtisanNewOrder(o);
}

export function notifyArtisanNewOrder(o: { id: string; m63_order_number: string; artisan_id: string; total_amount: number }) {
  notify({
    recipientId: o.artisan_id,
    role: 'ARTISAN',
    type: 'NEW_ORDER',
    category: 'order',
    title: `New order ${o.m63_order_number}`,
    body: `${inr(o.total_amount)} — confirm it from your Orders page.`,
    link: '/artisan/orders',
    dedupeKey: `order:${o.id}:new`,
  });
}

export function notifyPaymentReceived(o: { id: string; m63_order_number: string; buyer_id: string; artisan_id: string; total_amount: number; shipping_phone?: string }) {
  notify({
    recipientId: o.buyer_id,
    role: 'CUSTOMER',
    type: 'PAYMENT_SUCCESS',
    category: 'order',
    title: `Payment received for ${o.m63_order_number}`,
    body: `${inr(o.total_amount)} paid. The artisan will confirm your order soon.`,
    link: `/marketplace/orders/${o.id}`,
    dedupeKey: `order:${o.id}:paid`,
    phone: o.shipping_phone,
  });
  notifyArtisanNewOrder(o);
}

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  CONFIRMED: { title: 'confirmed by the artisan', body: 'The artisan is preparing your order.' },
  PROCESSING: { title: 'is being packed', body: 'Your handmade item is being packed.' },
  SHIPPED: { title: 'has shipped', body: 'Your order is on its way.' },
  DELIVERED: { title: 'was delivered', body: 'Enjoy your purchase! You can now review it.' },
  CANCELLED: { title: 'was cancelled', body: 'Any reserved items were released.' },
};

export function notifyOrderStatus(o: { id: string; m63_order_number: string; buyer_id: string; shipping_phone?: string }, status: string) {
  const copy = STATUS_COPY[status];
  if (!copy) return;
  notify({
    recipientId: o.buyer_id,
    role: 'CUSTOMER',
    type: `ORDER_${status}`,
    category: 'order',
    title: `Order ${o.m63_order_number} ${copy.title}`,
    body: copy.body,
    link: `/marketplace/orders/${o.id}`,
    dedupeKey: `order:${o.id}:${status}`,
    phone: o.shipping_phone,
  });
}

/**
 * New product published: tell customers who already bought from, or wishlisted products of,
 * this artisan (interested customers only — never a blast to everyone).
 */
export async function notifyNewProduct(product: { id: string; name: string; artisan_id: string }, artisanName?: string) {
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: buyers }, { data: artisanProducts }] = await Promise.all([
      supabase.from('orders').select('buyer_id').eq('artisan_id', product.artisan_id).neq('status', 'CANCELLED'),
      supabase.from('products').select('id').eq('artisan_id', product.artisan_id),
    ]);
    const productIds = (artisanProducts || []).map((p: any) => p.id).filter((id: string) => id !== product.id);
    const { data: fans } = productIds.length ? await supabase.from('wishlists').select('buyer_id').in('product_id', productIds) : { data: [] as any[] };
    const recipients = new Set<string>([...(buyers || []).map((b: any) => b.buyer_id), ...(fans || []).map((f: any) => f.buyer_id)]);
    for (const r of recipients) {
      if (!r || r.startsWith('guest')) continue;
      await notify({
        recipientId: r,
        role: 'CUSTOMER',
        type: 'NEW_PRODUCT',
        category: 'product',
        title: `New from ${artisanName || 'an artisan you like'}`,
        body: product.name,
        link: `/marketplace/product/${product.id}`,
        dedupeKey: `product:${product.id}:published`,
      });
    }
  } catch (e: any) {
    logger.warn(`[Notify] new product fan-out failed: ${e?.message}`);
  }
}

/** Genuine price reduction (M.R.P. offer or lower price) → customers who wishlisted this product. */
export async function notifyPriceDrop(product: { id: string; name: string }, oldPrice: number, newPrice: number) {
  if (!(newPrice < oldPrice)) return;
  try {
    const { data: fans } = await getSupabaseAdmin().from('wishlists').select('buyer_id').eq('product_id', product.id);
    for (const f of fans || []) {
      await notify({
        recipientId: f.buyer_id,
        role: 'CUSTOMER',
        type: 'PRICE_DROP',
        category: 'offer',
        title: `Price drop on ${product.name}`,
        body: `Now ${inr(newPrice)} (was ${inr(oldPrice)}).`,
        link: `/marketplace/product/${product.id}`,
        dedupeKey: `product:${product.id}:price:${newPrice}`,
      });
    }
  } catch (e: any) {
    logger.warn(`[Notify] price drop fan-out failed: ${e?.message}`);
  }
}
