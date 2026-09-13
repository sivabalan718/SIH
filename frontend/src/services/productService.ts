import { apiRequest } from './api.js';
import {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductStats,
} from '../types/product.js';

// Helper to map snake_case DB record to camelCase frontend Product model
function mapProduct(raw: any): Product {
  return {
    id: raw.id,
    artisanId: raw.artisan_id,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    subcategory: raw.subcategory,
    material: raw.material,
    color: raw.color,
    craftType: raw.craft_type,
    features: raw.features || [],
    price: typeof raw.price === 'string' ? parseFloat(raw.price) : raw.price,
    stockQuantity: raw.stock_quantity,
    status: raw.status,
    creationSource: raw.creation_source,
    primaryImageUrl: raw.primary_image_url,
    originalImageUrl: raw.original_image_url,
    enhancedImageUrl: raw.enhanced_image_url,
    selectedBackground: raw.selected_background,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    publishedAt: raw.published_at,
  };
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const data = await apiRequest<{ message: string; product: any }>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapProduct(data.product);
}

export async function getProducts(statusFilter?: string): Promise<Product[]> {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const data = await apiRequest<{ products: any[] }>(`/products${query}`);
  return (data.products || []).map(mapProduct);
}

export async function getProduct(productId: string): Promise<Product> {
  const data = await apiRequest<{ product: any }>(`/products/${productId}`);
  return mapProduct(data.product);
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload
): Promise<Product> {
  const data = await apiRequest<{ message: string; product: any }>(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapProduct(data.product);
}

export async function publishProduct(productId: string): Promise<Product> {
  const data = await apiRequest<{ message: string; product: any }>(`/products/${productId}/publish`, {
    method: 'POST',
  });
  return mapProduct(data.product);
}

export async function archiveProduct(productId: string): Promise<Product> {
  const data = await apiRequest<{ message: string; product: any }>(`/products/${productId}/archive`, {
    method: 'POST',
  });
  return mapProduct(data.product);
}

export async function getProductStats(): Promise<ProductStats> {
  const data = await apiRequest<{ stats: ProductStats }>('/products/stats');
  return data.stats;
}

export async function uploadProductImage(
  productId: string,
  file: File | Blob,
  variant: 'original' | 'enhanced' = 'original'
): Promise<string> {
  const token = localStorage.getItem('m63_access_token');
  const formData = new FormData();
  formData.append('image', file, 'photo.jpg');
  formData.append('variant', variant);

  const response = await fetch(`/api/v1/products/${productId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to upload image.' },
  }));

  if (!response.ok || !json.success) {
    const err: any = new Error(json.error?.message || 'Image upload failed.');
    err.code = json.error?.code || 'UPLOAD_ERROR';
    throw err;
  }

  return json.data.imageUrl;
}

export interface ProductEnhanceResponse {
  enhancedImageUrl: string;
  originalImageUrl: string;
  background: string;
  improvementsApplied: string[];
}

export async function enhanceExistingProductPhoto(
  productId: string,
  backgroundOption: string = 'WHITE',
  colorHex?: string
): Promise<ProductEnhanceResponse> {
  const data = await apiRequest<ProductEnhanceResponse>(`/products/${productId}/enhance-image`, {
    method: 'POST',
    body: JSON.stringify({
      backgroundOption,
      colorHex,
    }),
  });
  return data;
}

export async function selectProductImageVariant(
  productId: string,
  variant: 'original' | 'enhanced'
): Promise<{ product: Product; activeImageUrl: string; variant: string }> {
  const data = await apiRequest<{ message: string; product: any; activeImageUrl: string; variant: string }>(
    `/products/${productId}/select-image-variant`,
    {
      method: 'POST',
      body: JSON.stringify({ variant }),
    }
  );
  return {
    product: mapProduct(data.product),
    activeImageUrl: data.activeImageUrl,
    variant: data.variant,
  };
}

