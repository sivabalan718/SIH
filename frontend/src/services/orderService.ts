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
}

export async function createOrder(
  shippingInfo: ShippingDetails,
  customItems?: Array<{ product_id: string; quantity: number }>,
  idempotencyKey?: string
): Promise<{ orders: OrderRecord[] }> {
  const res = await apiRequest<{ orders: OrderRecord[] }>('/orders', {
    method: 'POST',
    body: JSON.stringify({ shippingInfo, customItems, idempotencyKey }),
  });
  return res;
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
