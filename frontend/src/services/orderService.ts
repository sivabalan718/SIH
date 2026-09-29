import { apiRequest } from './api.js';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

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
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod | null;
  checkout_group_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  paid_at?: string | null;
  payment_failure_reason?: string | null;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
export type PaymentMethod = 'ONLINE' | 'COD';

export async function createOrder(
  shippingInfo: ShippingDetails,
  customItems?: Array<{ product_id: string; quantity: number }>,
  idempotencyKey?: string,
  paymentMethod: PaymentMethod = 'COD'
): Promise<{ orders: OrderRecord[]; checkout_group_id: string }> {
  const res = await apiRequest<{ orders: OrderRecord[]; checkout_group_id: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify({ shippingInfo, customItems, idempotencyKey, paymentMethod }),
  });
  return res;
}

/** Customer-facing tracking stage for an order (derived only from real status/payment fields). */
export function describeOrder(o: OrderRecord): { label: string; tone: 'ok' | 'warn' | 'bad' | 'info' } {
  if (o.status === 'CANCELLED') return { label: 'Cancelled', tone: 'bad' };
  if (o.payment_method === 'ONLINE' && o.payment_status !== 'PAID') {
    return o.payment_status === 'FAILED' ? { label: 'Payment failed — retry payment', tone: 'bad' } : { label: 'Payment pending', tone: 'warn' };
  }
  const d = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '');
  switch (o.status) {
    case 'DELIVERED':
      return { label: `Delivered ${d(o.delivered_at)}`, tone: 'ok' };
    case 'SHIPPED':
      return { label: `Shipped ${d(o.shipped_at)}`, tone: 'info' };
    case 'PROCESSING':
      return { label: 'Being packed by the artisan', tone: 'info' };
    case 'CONFIRMED':
      return { label: 'Confirmed by the artisan', tone: 'info' };
    default:
      return { label: 'Order placed', tone: 'info' };
  }
}

export async function fetchBuyerOrders(): Promise<OrderRecord[]> {
  const res = await apiRequest<{ orders: OrderRecord[] }>('/orders/buyer', {
    method: 'GET',
  });
  return res.orders;
}

export async function fetchBuyerOrderById(id: string): Promise<OrderRecord> {
  const res = await apiRequest<{ order: OrderRecord }>(`/orders/buyer/${id}`, {
    method: 'GET',
  });
  return res.order;
}

export async function fetchArtisanOrders(): Promise<OrderRecord[]> {
  const res = await apiRequest<{ orders: OrderRecord[] }>('/orders/artisan', {
    method: 'GET',
  });
  return res.orders;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderRecord> {
  const res = await apiRequest<{ order: OrderRecord }>(`/orders/artisan/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return res.order;
}

export async function cancelOrder(orderId: string): Promise<OrderRecord> {
  const res = await apiRequest<{ order: OrderRecord }>(`/orders/${orderId}/cancel`, {
    method: 'PATCH',
  });
  return res.order;
}
