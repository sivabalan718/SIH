import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getBuyerCart, clearBuyerCart, CartItem } from './cart.service.js';
import { getMarketplaceProductById } from './marketplace.service.js';
import { updateProduct } from './product.service.js';
import { notifyOrderPlaced, notifyOrderStatus } from './notification.service.js';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type PaymentMethod = 'ONLINE' | 'COD';

export interface ShippingDetails {
  name: string;
  phone: string;
  address: string;
  city?: string;
  district?: string;
  postal_code?: string;
}

export interface OrderItemSnapshot {
  id?: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  subtotal: number;
  artisan_id: string;
  primary_image_url?: string | null;
}

export interface OrderRecord {
  id: string;
  m63_order_number: string;
  buyer_id: string;
  artisan_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  items: OrderItemSnapshot[];
  placed_at: string;
  updated_at: string;
  confirmed_at?: string | null;
  processing_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  checkout_group_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  paid_at?: string | null;
  payment_failure_reason?: string | null;
}

/** Unpaid online checkouts release their reserved stock after this window. */
export const ONLINE_PAYMENT_WINDOW_MS = 30 * 60 * 1000;

// Legacy local store (orders placed before the orders table existed). Read-only fallback;
// new orders are written to the database, and only fall back here if the database is unreachable.
const localOrderMemoryStore = new Map<string, OrderRecord>();
const DISK_BACKUP_PATH = path.resolve(process.cwd(), 'src/data/orders_backup.json');

function saveOrdersToDisk() {
  try {
    const dir = path.dirname(DISK_BACKUP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DISK_BACKUP_PATH, JSON.stringify(Array.from(localOrderMemoryStore.values()), null, 2), 'utf-8');
  } catch (e: any) {
    logger.warn(`[OrderService] Unable to backup orders to disk: ${e.message}`);
  }
}

function loadOrdersFromDisk() {
  try {
    if (fs.existsSync(DISK_BACKUP_PATH)) {
      const items: OrderRecord[] = JSON.parse(fs.readFileSync(DISK_BACKUP_PATH, 'utf-8'));
      for (const item of items) {
        localOrderMemoryStore.set(item.id, {
          ...item,
          payment_status: item.payment_status || 'PENDING',
          payment_method: item.payment_method || 'COD',
        });
      }
      logger.info(`[OrderService] Restored ${items.length} legacy orders from disk.`);
    }
  } catch (e: any) {
    logger.warn(`[OrderService] Could not read disk orders backup: ${e.message}`);
  }
}
loadOrdersFromDisk();

const httpError = (message: string, statusCode: number, code?: string) => Object.assign(new Error(message), { statusCode, code });

function generateOrderNumber(): string {
  // M63-YYMMDD-XXXXX (date + 5 random base36 chars) — readable and practically collision-free.
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `M63-${ymd}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function mapDbOrder(o: any): OrderRecord {
  return {
    id: o.id,
    m63_order_number: o.m63_order_number || `M63-${String(o.id).substring(0, 4)}`,
    buyer_id: o.buyer_id,
    artisan_id: o.artisan_id,
    status: o.status,
    subtotal: Number(o.subtotal),
    delivery_charge: Number(o.delivery_charge || 0),
    total_amount: Number(o.total_amount),
    shipping_name: o.shipping_name,
    shipping_phone: o.shipping_phone,
    shipping_address: o.shipping_address,
    items: (o.order_items || []).map((i: any) => ({
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id,
      product_name_snapshot: i.product_name_snapshot,
      unit_price_snapshot: Number(i.unit_price_snapshot),
      quantity: i.quantity,
      subtotal: Number(i.subtotal),
      artisan_id: i.artisan_id,
      primary_image_url: i.primary_image_url,
    })),
    placed_at: o.placed_at,
    updated_at: o.updated_at,
    confirmed_at: o.confirmed_at,
    processing_at: o.processing_at,
    shipped_at: o.shipped_at,
    delivered_at: o.delivered_at,
    cancelled_at: o.cancelled_at,
    payment_status: o.payment_status || 'PENDING',
    payment_method: o.payment_method || null,
    checkout_group_id: o.checkout_group_id,
    razorpay_order_id: o.razorpay_order_id,
    razorpay_payment_id: o.razorpay_payment_id,
    paid_at: o.paid_at,
    payment_failure_reason: o.payment_failure_reason,
  };
}

/* -------------------------------------------------------------------------- */
/*  Stock                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Change stock by `delta` using optimistic concurrency (update only if stock is unchanged),
 * so two simultaneous checkouts can never both take the last unit.
 */
async function adjustStock(productId: string, artisanId: string, delta: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error } = await supabase.from('products').select('stock_quantity').eq('id', productId).maybeSingle();
    if (error || !row) {
      // Product lives only in the local fallback store
      const prod = await getMarketplaceProductById(productId);
      if (!prod) throw httpError('Product is no longer available.', 400);
      const next = prod.stock_quantity + delta;
      if (next < 0) throw httpError(`Insufficient stock for "${prod.name}".`, 409, 'OUT_OF_STOCK');
      await updateProduct(productId, artisanId, { stock_quantity: next });
      return;
    }
    const next = row.stock_quantity + delta;
    if (next < 0) throw httpError('Insufficient stock — another customer just bought the last units.', 409, 'OUT_OF_STOCK');
    const { data: updated } = await supabase
      .from('products')
      .update({ stock_quantity: next })
      .eq('id', productId)
      .eq('stock_quantity', row.stock_quantity)
      .select('id');
    if (updated && updated.length > 0) return;
  }
  throw httpError('Stock is changing rapidly for this product. Please try again.', 409, 'STOCK_CONFLICT');
}

/* -------------------------------------------------------------------------- */
/*  Create                                                                    */
/* -------------------------------------------------------------------------- */

const IDEMPOTENCY_RE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Create order(s) with server-side prices, atomic stock reservation, one order per artisan,
 * and duplicate-submit protection. Online-payment orders stay payment PENDING until the
 * payment is verified server-side.
 */
export async function createOrder(
  buyerId: string,
  shippingInfo: ShippingDetails,
  customItems?: Array<{ product_id: string; quantity: number }>,
  idempotencyKey?: string,
  paymentMethod: PaymentMethod = 'COD'
): Promise<{ orders: OrderRecord[]; checkout_group_id: string }> {
  const supabase = getSupabaseAdmin();
  const checkoutGroupId = idempotencyKey && IDEMPOTENCY_RE.test(idempotencyKey) ? `chk_${idempotencyKey}` : `chk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  // Duplicate submit (double tap / retry after network drop): return the existing checkout.
  if (idempotencyKey) {
    const { data: existing } = await supabase.from('orders').select('*, order_items(*)').eq('checkout_group_id', checkoutGroupId).eq('buyer_id', buyerId);
    if (existing && existing.length > 0) {
      logger.info(`[OrderService] Duplicate checkout ${checkoutGroupId} ignored.`);
      return { orders: existing.map(mapDbOrder), checkout_group_id: checkoutGroupId };
    }
  }

  // 1. Items: "Buy now" items or the buyer's cart
  let itemsToOrder: CartItem[] = [];
  if (customItems && customItems.length > 0) {
    if (customItems.length > 20) throw httpError('Too many items in one order.', 400);
    for (const cItem of customItems) {
      const qty = Number(cItem?.quantity);
      if (!cItem?.product_id || !Number.isInteger(qty) || qty < 1 || qty > 100) {
        throw httpError('Each item needs a product and a whole-number quantity between 1 and 100.', 400);
      }
      const prod = await getMarketplaceProductById(String(cItem.product_id));
      if (!prod) throw httpError('A product in your order is unavailable.', 400);
      if (prod.stock_quantity < qty) {
        throw httpError(`Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, requested: ${qty}.`, 400);
      }
      itemsToOrder.push({
        product_id: prod.id,
        quantity: qty,
        unit_price: prod.price,
        subtotal: prod.price * qty,
        product_name: prod.name,
        artisan_id: prod.artisan_id,
        artisan_name: prod.artisan_name,
        primary_image_url: prod.primary_image_url,
        stock_quantity: prod.stock_quantity,
        is_available: true,
      });
    }
  } else {
    const cart = await getBuyerCart(buyerId);
    if (cart.items.length === 0) throw httpError('Your cart is empty.', 400);
    if (cart.has_stock_warning) {
      throw httpError('Stock availability changed for items in your cart. Please review your cart before checkout.', 400);
    }
    itemsToOrder = cart.items.filter((i) => i.quantity > 0);
  }

  // 2. Authoritative DB price & status (never trust client/cart values)
  for (const item of itemsToOrder) {
    const { data: dbProd } = await supabase.from('products').select('price, status').eq('id', item.product_id).maybeSingle();
    if (dbProd) {
      if (dbProd.status !== 'PUBLISHED') throw httpError(`"${item.product_name}" is no longer available for purchase.`, 400);
      item.unit_price = Number(dbProd.price);
      item.subtotal = Math.round(Number(dbProd.price) * item.quantity * 100) / 100;
    }
  }

  // 3. Reserve stock atomically; roll back everything if any item fails
  const reserved: CartItem[] = [];
  try {
    for (const item of itemsToOrder) {
      await adjustStock(item.product_id, item.artisan_id, -item.quantity);
      reserved.push(item);
    }
  } catch (err) {
    for (const r of reserved) await adjustStock(r.product_id, r.artisan_id, r.quantity).catch(() => {});
    throw err;
  }

  // 4. One order per artisan
  const byArtisan = new Map<string, CartItem[]>();
  for (const item of itemsToOrder) byArtisan.set(item.artisan_id, [...(byArtisan.get(item.artisan_id) || []), item]);

  const now = new Date().toISOString();
  const fullAddress = [shippingInfo.address, shippingInfo.city, shippingInfo.district, shippingInfo.postal_code].filter(Boolean).join(', ');
  const createdOrders: OrderRecord[] = [];

  try {
    for (const [artisanId, groupItems] of byArtisan.entries()) {
      const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const subtotal = Math.round(groupItems.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100;
      const deliveryCharge = 0; // M63 currently offers free delivery
      const record: OrderRecord = {
        id: orderId,
        m63_order_number: generateOrderNumber(),
        buyer_id: buyerId,
        artisan_id: artisanId,
        status: 'PENDING',
        subtotal,
        delivery_charge: deliveryCharge,
        total_amount: subtotal + deliveryCharge,
        shipping_name: shippingInfo.name,
        shipping_phone: shippingInfo.phone,
        shipping_address: fullAddress,
        items: groupItems.map((gi) => ({
          order_id: orderId,
          product_id: gi.product_id,
          product_name_snapshot: gi.product_name,
          unit_price_snapshot: gi.unit_price,
          quantity: gi.quantity,
          subtotal: gi.subtotal,
          artisan_id: gi.artisan_id,
          primary_image_url: gi.primary_image_url,
        })),
        placed_at: now,
        updated_at: now,
        payment_status: 'PENDING',
        payment_method: paymentMethod,
        checkout_group_id: checkoutGroupId,
      };

      const { items, ...orderRow } = record;
      const { error: orderErr } = await supabase.from('orders').insert(orderRow);
      if (orderErr) throw httpError(`Could not save your order (${orderErr.message}).`, 500);
      const { data: itemRows, error: itemErr } = await supabase.from('order_items').insert(items).select();
      if (itemErr) {
        await supabase.from('orders').delete().eq('id', orderId);
        throw httpError(`Could not save your order items (${itemErr.message}).`, 500);
      }
      record.items = (itemRows || items).map((i: any) => ({ ...i, unit_price_snapshot: Number(i.unit_price_snapshot), subtotal: Number(i.subtotal) }));
      createdOrders.push(record);
    }
  } catch (err) {
    // Undo partial checkout: remove created orders and release all reserved stock
    for (const o of createdOrders) await supabase.from('orders').delete().eq('id', o.id);
    for (const r of reserved) await adjustStock(r.product_id, r.artisan_id, r.quantity).catch(() => {});
    throw err;
  }

  if (!customItems || customItems.length === 0) await clearBuyerCart(buyerId);
  for (const o of createdOrders) notifyOrderPlaced(o);

  logger.info(`[OrderService] Created ${createdOrders.length} order(s) (${paymentMethod}) for buyer ${buyerId}, group ${checkoutGroupId}`);
  return { orders: createdOrders, checkout_group_id: checkoutGroupId };
}

/* -------------------------------------------------------------------------- */
/*  Read                                                                      */
/* -------------------------------------------------------------------------- */

/** Online checkouts left unpaid past the window are cancelled and their stock released. */
async function expireStaleOnlineOrders(orders: OrderRecord[]): Promise<void> {
  const cutoff = Date.now() - ONLINE_PAYMENT_WINDOW_MS;
  for (const o of orders) {
    if (
      o.payment_method === 'ONLINE' &&
      o.payment_status !== 'PAID' &&
      o.status === 'PENDING' &&
      new Date(o.placed_at).getTime() < cutoff
    ) {
      await cancelAndRelease(o, 'Payment not completed within 30 minutes.').catch((e) =>
        logger.warn(`[OrderService] Could not expire order ${o.id}: ${e.message}`)
      );
    }
  }
}

export async function getBuyerOrders(buyerId: string): Promise<OrderRecord[]> {
  const supabase = getSupabaseAdmin();
  let dbOrders: OrderRecord[] = [];
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('buyer_id', buyerId)
    .order('placed_at', { ascending: false });
  if (!error && data) dbOrders = data.map(mapDbOrder);

  await expireStaleOnlineOrders(dbOrders);

  const merged = new Map<string, OrderRecord>();
  for (const o of Array.from(localOrderMemoryStore.values()).filter((o) => o.buyer_id === buyerId)) merged.set(o.id, o);
  for (const o of dbOrders) merged.set(o.id, o);
  return Array.from(merged.values()).sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
}

/** Strict ownership: a buyer can only read their own order. */
export async function getBuyerOrderById(buyerId: string, orderId: string): Promise<OrderRecord | null> {
  const orders = await getBuyerOrders(buyerId);
  return orders.find((o) => o.id === orderId) || null;
}

export async function getOrdersByCheckoutGroup(checkoutGroupId: string): Promise<OrderRecord[]> {
  const { data } = await getSupabaseAdmin().from('orders').select('*, order_items(*)').eq('checkout_group_id', checkoutGroupId);
  return (data || []).map(mapDbOrder);
}

/**
 * Orders an artisan must fulfil. Unpaid online orders are hidden until payment is verified,
 * so artisans never ship something that was not paid for.
 */
export async function getArtisanOrders(artisanId: string): Promise<OrderRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('orders').select('*, order_items(*)');
  if (artisanId !== 'all') query = query.eq('artisan_id', artisanId);
  const { data, error } = await query.order('placed_at', { ascending: false });
  const dbOrders = !error && data ? data.map(mapDbOrder) : [];
  await expireStaleOnlineOrders(dbOrders);

  const memOrders = Array.from(localOrderMemoryStore.values()).filter(
    (o) => artisanId === 'all' || o.artisan_id === artisanId || o.items.some((i) => i.artisan_id === artisanId)
  );

  const merged = new Map<string, OrderRecord>();
  for (const o of [...memOrders, ...dbOrders]) merged.set(o.id, o);
  return Array.from(merged.values())
    .filter((o) => !(o.payment_method === 'ONLINE' && o.payment_status !== 'PAID' && o.status !== 'CANCELLED'))
    .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
}

async function findOrderById(orderId: string): Promise<OrderRecord | null> {
  const { data } = await getSupabaseAdmin().from('orders').select('*, order_items(*)').eq('id', orderId).maybeSingle();
  if (data) return mapDbOrder(data);
  return localOrderMemoryStore.get(orderId) || null;
}

/* -------------------------------------------------------------------------- */
/*  Status                                                                    */
/* -------------------------------------------------------------------------- */

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

async function persistStatus(order: OrderRecord, newStatus: OrderStatus, extra: Record<string, any> = {}): Promise<OrderRecord> {
  const now = new Date().toISOString();
  const stamp: Record<string, string> = {};
  if (newStatus === 'CONFIRMED') stamp.confirmed_at = now;
  if (newStatus === 'PROCESSING') stamp.processing_at = now;
  if (newStatus === 'SHIPPED') stamp.shipped_at = now;
  if (newStatus === 'DELIVERED') stamp.delivered_at = now;
  if (newStatus === 'CANCELLED') stamp.cancelled_at = now;
  const updated: OrderRecord = { ...order, ...stamp, ...extra, status: newStatus, updated_at: now };

  if (localOrderMemoryStore.has(order.id)) {
    localOrderMemoryStore.set(order.id, updated);
    saveOrdersToDisk();
  } else {
    const { error } = await getSupabaseAdmin()
      .from('orders')
      .update({ status: newStatus, updated_at: now, ...stamp, ...extra })
      .eq('id', order.id)
      .eq('status', order.status); // guards against concurrent double transitions
    if (error) throw httpError('Could not update the order. Please try again.', 500);
  }
  return updated;
}

export async function updateOrderStatus(artisanId: string, orderId: string, newStatus: OrderStatus): Promise<OrderRecord> {
  const order = await findOrderById(orderId);
  const owns = order && (artisanId === 'all' || order.artisan_id === artisanId || order.items.some((i) => i.artisan_id === artisanId));
  if (!order || !owns) throw httpError('Order not found or access denied.', 404);

  if (order.status === 'CANCELLED') throw httpError('Cannot modify status of a cancelled order.', 400);
  if (!ALLOWED_TRANSITIONS[order.status]?.includes(newStatus)) {
    throw httpError(`Invalid status transition from ${order.status} to ${newStatus}.`, 400);
  }
  if (order.payment_method === 'ONLINE' && order.payment_status !== 'PAID' && newStatus !== 'CANCELLED') {
    throw httpError('This order has not been paid yet.', 400);
  }

  if (newStatus === 'CANCELLED') return cancelAndRelease(order, 'Cancelled by artisan.');

  const extra: Record<string, any> = {};
  // Cash on delivery is collected when the order is delivered.
  if (newStatus === 'DELIVERED' && order.payment_method === 'COD') {
    extra.payment_status = 'PAID';
    extra.paid_at = new Date().toISOString();
  }
  const updated = await persistStatus(order, newStatus, extra);
  notifyOrderStatus(updated, newStatus);
  logger.info(`[OrderService] Order ${orderId} → ${newStatus}`);
  return updated;
}

/** Cancel and release reserved stock exactly once (the status guard prevents double release). */
async function cancelAndRelease(order: OrderRecord, reason: string): Promise<OrderRecord> {
  if (order.status === 'CANCELLED') return order;
  const extra: Record<string, any> = {};
  if (order.payment_status !== 'PAID') {
    extra.payment_status = 'CANCELLED';
    extra.payment_failure_reason = reason;
  }
  const updated = await persistStatus(order, 'CANCELLED', extra);
  for (const item of order.items) await adjustStock(item.product_id, item.artisan_id, item.quantity).catch(() => {});
  notifyOrderStatus(updated, 'CANCELLED');
  return updated;
}

export async function cancelOrder(userId: string, orderId: string): Promise<OrderRecord> {
  const order = await findOrderById(orderId);
  if (!order) throw httpError('Order not found.', 404);
  if (order.buyer_id !== userId) throw httpError('Unauthorized to cancel this order.', 403);
  if (order.status === 'CANCELLED') return order; // idempotent
  if (order.status === 'DELIVERED' || order.status === 'SHIPPED') {
    throw httpError('Cannot cancel an order that has already been shipped or delivered.', 400);
  }
  if (order.payment_status === 'PAID' && order.payment_method === 'ONLINE') {
    throw httpError('This order is already paid. Please contact M63 support to cancel it and receive a refund.', 400);
  }
  return cancelAndRelease(order, 'Cancelled by customer.');
}
