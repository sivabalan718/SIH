import { apiRequest } from './api.js';

export interface CartItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product_name: string;
  artisan_id: string;
  artisan_name: string;
  primary_image_url: string | null;
  stock_quantity: number;
  is_available: boolean;
  stock_warning?: string;
}

export interface CartSummary {
  buyer_id: string;
  items: CartItem[];
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  has_stock_warning: boolean;
  warnings: string[];
}

export async function fetchBuyerCart(lang: 'en' | 'ta' | 'hi' = 'en'): Promise<CartSummary> {
  const res = await apiRequest<{ cart: CartSummary }>(`/cart?lang=${lang}`, {
    method: 'GET',
  });
  return res.cart;
}

export async function addToBuyerCart(productId: string, quantity: number = 1): Promise<CartSummary> {
  const res = await apiRequest<{ cart: CartSummary }>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
  return res.cart;
}

export async function updateBuyerCartItem(productId: string, quantity: number): Promise<CartSummary> {
  const res = await apiRequest<{ cart: CartSummary }>(`/cart/items/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
  return res.cart;
}

export async function removeBuyerCartItem(productId: string): Promise<CartSummary> {
  const res = await apiRequest<{ cart: CartSummary }>(`/cart/items/${productId}`, {
    method: 'DELETE',
  });
  return res.cart;
}

export async function clearBuyerCart(): Promise<void> {
  await apiRequest('/cart', { method: 'DELETE' });
}
