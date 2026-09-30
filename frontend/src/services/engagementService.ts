import { apiRequest, getStoredToken } from './api.js';

/* ------------------------------- Wishlist ------------------------------- */
export const fetchAccountWishlist = () => apiRequest<{ product_ids: string[] }>('/wishlist', { method: 'GET' }).then((r) => r.product_ids);
export const addAccountWishlist = (productId: string) =>
  apiRequest<{ product_ids: string[] }>('/wishlist/items', { method: 'POST', body: JSON.stringify({ productId }) }).then((r) => r.product_ids);
export const removeAccountWishlist = (productId: string) =>
  apiRequest<{ product_ids: string[] }>(`/wishlist/items/${encodeURIComponent(productId)}`, { method: 'DELETE' }).then((r) => r.product_ids);
export const mergeAccountWishlist = (productIds: string[]) =>
  apiRequest<{ product_ids: string[] }>('/wishlist/merge', { method: 'POST', body: JSON.stringify({ productIds }) }).then((r) => r.product_ids);

/* ----------------------------- Notifications ----------------------------- */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
export interface NotificationPrefs {
  order_updates: boolean;
  new_products: boolean;
  offers: boolean;
  sms: boolean;
  whatsapp: boolean;
}
export interface ChannelStatus {
  in_app: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export const fetchNotifications = () => apiRequest<{ notifications: AppNotification[]; unread: number }>('/notifications', { method: 'GET' });
export const markNotificationRead = (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => apiRequest('/notifications/read-all', { method: 'POST' });
export const fetchNotificationPrefs = () => apiRequest<{ preferences: NotificationPrefs; channels: ChannelStatus }>('/notifications/preferences', { method: 'GET' });
export const saveNotificationPrefs = (p: Partial<NotificationPrefs>) =>
  apiRequest<{ preferences: NotificationPrefs; channels: ChannelStatus }>('/notifications/preferences', { method: 'PUT', body: JSON.stringify(p) });

/* ------------------------------ Customer photos ------------------------------ */
/** Upload one photo (review / return request). Returns the stored URL. */
export async function uploadCustomerPhoto(file: File): Promise<string> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
  const body = new FormData();
  body.append('image', file);
  const token = getStoredToken();
  const res = await fetch(`${API_BASE_URL}/uploads/customer-photo`, { method: 'POST', body, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'Could not upload the photo.');
  return json.data.url;
}

/* ---------------------------- Returns / replacements ---------------------------- */
export type RequestType = 'REFUND' | 'REPLACEMENT';
export type RequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export interface OrderRequest {
  id: string;
  order_id: string;
  type: RequestType;
  reason: string;
  details: string | null;
  photo_urls: string[];
  status: RequestStatus;
  artisan_note: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  created_at: string;
  resolved_at: string | null;
  orders?: { m63_order_number: string; total_amount: number; payment_method: string; payment_status: string; shipping_name: string };
}

export const fetchRequestOptions = () => apiRequest<{ reasons: string[]; window_days: number }>('/orders/requests/options', { method: 'GET' });
export const fetchMyRequests = () => apiRequest<{ requests: OrderRequest[] }>('/orders/requests/mine', { method: 'GET' }).then((r) => r.requests);
export const createOrderRequest = (orderId: string, body: { type: RequestType; reason: string; details?: string; photo_urls?: string[] }) =>
  apiRequest<{ request: OrderRequest }>(`/orders/${orderId}/requests`, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.request);
export const fetchArtisanRequests = () => apiRequest<{ requests: OrderRequest[] }>('/artisan/requests', { method: 'GET' }).then((r) => r.requests);
export const updateArtisanRequest = (id: string, action: 'APPROVE' | 'REJECT' | 'COMPLETE', note?: string) =>
  apiRequest<{ request: OrderRequest }>(`/artisan/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action, note }) }).then((r) => r.request);

/* ------------------------------ M63 AI understanding ------------------------------ */
export interface ParsedQuery {
  intent: 'SEARCH' | 'ORDERS' | 'OFFERS' | 'TOP_RATED' | 'PRODUCT_QUESTION' | 'SIMILAR' | 'HELP';
  keywords: string[];
  category?: string | null;
  material?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  in_stock_only?: boolean;
}
export const parseShopperQuery = (query: string, categories: string[]) =>
  apiRequest<{ parsed: ParsedQuery | null; source: string }>('/marketplace/assistant/parse', { method: 'POST', body: JSON.stringify({ query, categories }) })
    .then((r) => r.parsed)
    .catch(() => null);
