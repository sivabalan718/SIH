import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { getMarketplaceProductById } from './marketplace.service.js';

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

// Memory fallback store for carts (keyed by buyer_id)
const localCartMemoryStore = new Map<string, Array<{ product_id: string; quantity: number }>>();

/**
 * Get current cart for buyer with live revalidation of price, published status, and stock
 */
export async function getBuyerCart(buyerId: string, language: 'en' | 'ta' | 'hi' = 'en'): Promise<CartSummary> {
  const supabase = getSupabaseAdmin();
  let rawItems: Array<{ product_id: string; quantity: number }> = [];

  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('buyer_id', buyerId);

    if (!error && data) {
      rawItems = data;
    } else {
      rawItems = localCartMemoryStore.get(buyerId) || [];
    }
  } catch (e) {
    rawItems = localCartMemoryStore.get(buyerId) || [];
  }

  const items: CartItem[] = [];
  const warnings: string[] = [];
  let subtotalSum = 0;
  let hasWarning = false;

  for (const raw of rawItems) {
    const prod = await getMarketplaceProductById(raw.product_id, language);

    if (!prod) {
      warnings.push(`Product is no longer available and was removed from your cart.`);
      hasWarning = true;
      continue;
    }

    const availableStock = prod.stock_quantity;
    let actualQty = raw.quantity;
    let stockWarn: string | undefined = undefined;

    if (availableStock <= 0) {
      actualQty = 0;
      stockWarn = `This item is currently out of stock.`;
      warnings.push(`"${prod.name}" is currently out of stock.`);
      hasWarning = true;
    } else if (actualQty > availableStock) {
      actualQty = availableStock;
      stockWarn = `Stock changed: Only ${availableStock} available.`;
      warnings.push(`"${prod.name}" stock changed. Quantity updated to ${availableStock}.`);
      hasWarning = true;
    }

    const unitPrice = prod.price;
    const itemSubtotal = unitPrice * actualQty;
    subtotalSum += itemSubtotal;

    items.push({
      product_id: prod.id,
      quantity: actualQty,
      unit_price: unitPrice,
      subtotal: itemSubtotal,
      product_name: prod.name,
      artisan_id: prod.artisan_id,
      artisan_name: prod.artisan_name,
      primary_image_url: prod.primary_image_url,
      stock_quantity: availableStock,
      is_available: availableStock > 0,
      stock_warning: stockWarn,
    });
  }

  return {
    buyer_id: buyerId,
    items,
    subtotal: subtotalSum,
    delivery_charge: 0, // Delivery charge logic placeholder
    total_amount: subtotalSum,
    has_stock_warning: hasWarning,
    warnings,
  };
}

/**
 * Add or update item in buyer's cart
 */
export async function addItemToCart(
  buyerId: string,
  productId: string,
  quantity: number = 1
): Promise<CartSummary> {
  const prod = await getMarketplaceProductById(productId);
  if (!prod) {
    throw Object.assign(new Error('Product not found or unavailable for purchase.'), { statusCode: 404 });
  }

  if (prod.stock_quantity <= 0) {
    throw Object.assign(new Error('This product is out of stock.'), { statusCode: 400 });
  }

  const existingCart = await getBuyerCart(buyerId);
  const existingItem = existingCart.items.find((i) => i.product_id === productId);
  const newQty = (existingItem?.quantity || 0) + quantity;

  if (newQty > prod.stock_quantity) {
    throw Object.assign(new Error(`Cannot add ${quantity} items. Maximum available stock is ${prod.stock_quantity}.`), { statusCode: 400 });
  }

  // Update in Supabase / memory store
  const supabase = getSupabaseAdmin();
  try {
    const { error } = await supabase
      .from('cart_items')
      .upsert({ buyer_id: buyerId, product_id: productId, quantity: newQty }, { onConflict: 'buyer_id,product_id' });

    if (error) throw error;
  } catch (e) {
    const memList = localCartMemoryStore.get(buyerId) || [];
    const idx = memList.findIndex((i) => i.product_id === productId);
    if (idx >= 0) memList[idx].quantity = newQty;
    else memList.push({ product_id: productId, quantity: newQty });
    localCartMemoryStore.set(buyerId, memList);
  }

  return getBuyerCart(buyerId);
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  buyerId: string,
  productId: string,
  quantity: number
): Promise<CartSummary> {
  if (quantity <= 0) {
    return removeCartItem(buyerId, productId);
  }

  const prod = await getMarketplaceProductById(productId);
  if (!prod) {
    throw Object.assign(new Error('Product not found.'), { statusCode: 404 });
  }

  if (quantity > prod.stock_quantity) {
    throw Object.assign(new Error(`Requested quantity (${quantity}) exceeds available stock (${prod.stock_quantity}).`), { statusCode: 400 });
  }

  const supabase = getSupabaseAdmin();
  try {
    const { error } = await supabase
      .from('cart_items')
      .upsert({ buyer_id: buyerId, product_id: productId, quantity }, { onConflict: 'buyer_id,product_id' });

    if (error) throw error;
  } catch (e) {
    const memList = localCartMemoryStore.get(buyerId) || [];
    const idx = memList.findIndex((i) => i.product_id === productId);
    if (idx >= 0) memList[idx].quantity = quantity;
    else memList.push({ product_id: productId, quantity });
    localCartMemoryStore.set(buyerId, memList);
  }

  return getBuyerCart(buyerId);
}

/**
 * Remove item from cart
 */
export async function removeCartItem(buyerId: string, productId: string): Promise<CartSummary> {
  const supabase = getSupabaseAdmin();
  try {
    await supabase.from('cart_items').delete().eq('buyer_id', buyerId).eq('product_id', productId);
  } catch (e) {}

  const memList = localCartMemoryStore.get(buyerId) || [];
  localCartMemoryStore.set(
    buyerId,
    memList.filter((i) => i.product_id !== productId)
  );

  return getBuyerCart(buyerId);
}

/**
 * Clear buyer cart
 */
export async function clearBuyerCart(buyerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  try {
    await supabase.from('cart_items').delete().eq('buyer_id', buyerId);
  } catch (e) {}

  localCartMemoryStore.delete(buyerId);
}
