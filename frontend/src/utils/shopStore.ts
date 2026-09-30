import { useEffect, useState } from 'react';
import { SupportedLang } from './marketplaceI18n.js';
import { getStoredToken } from '../services/api.js';
import { addAccountWishlist, mergeAccountWishlist, removeAccountWishlist } from '../services/engagementService.js';

/**
 * Per-device customer conveniences (wishlist, recently viewed). Stored locally and wrapped in
 * try/catch so private windows or blocked storage never break the marketplace.
 */
const WISHLIST_KEY = 'm63_wishlist';
const RECENT_KEY = 'm63_recently_viewed';
const LANG_KEY = 'm63_marketplace_lang';
const CHANGE_EVENT = 'm63:shop-store';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — keep in-memory behaviour only
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

export function getWishlist(): string[] {
  return read<string[]>(WISHLIST_KEY, []);
}

export function toggleWishlist(productId: string): boolean {
  const list = getWishlist();
  const saved = !list.includes(productId);
  write(WISHLIST_KEY, saved ? [productId, ...list] : list.filter((id) => id !== productId));
  // Signed in: also save to the account so the wishlist follows the customer across devices
  if (getStoredToken()) {
    (saved ? addAccountWishlist(productId) : removeAccountWishlist(productId)).then((ids) => write(WISHLIST_KEY, ids)).catch(() => undefined);
  }
  return saved;
}

/** After sign-in: merge items saved on this device into the account, then use the account list. */
export async function syncWishlistWithAccount(): Promise<void> {
  if (!getStoredToken()) return;
  try {
    write(WISHLIST_KEY, await mergeAccountWishlist(getWishlist()));
  } catch {
    // account wishlist unavailable — keep the device list
  }
}

export function getRecentlyViewed(): string[] {
  return read<string[]>(RECENT_KEY, []);
}

export function recordRecentlyViewed(productId: string) {
  write(RECENT_KEY, [productId, ...getRecentlyViewed().filter((id) => id !== productId)].slice(0, 20));
}

export function getShopLang(): SupportedLang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ta' || saved === 'hi' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

export function setShopLang(lang: SupportedLang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: LANG_KEY }));
}

/** Re-render when any shop store value changes (this tab or another). */
export function useShopStore<T>(selector: () => T): T {
  const [value, setValue] = useState<T>(selector);
  useEffect(() => {
    const update = () => setValue(selector());
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return value;
}

/* ---------- Cart badge + toast events ---------- */
export const CART_EVENT = 'm63:cart-updated';
export const TOAST_EVENT = 'm63:toast';

export function notifyCartUpdated(itemCount?: number) {
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: itemCount }));
}

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

export const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
