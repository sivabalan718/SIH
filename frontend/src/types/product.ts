export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CreationSource = 'MANUAL' | 'AI_ASSISTED';

export interface Product {
  id: string;
  artisanId: string;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  material: string | null;
  color: string | null;
  craftType: string | null;
  features: string[];
  price: number;
  stockQuantity: number;
  status: ProductStatus;
  creationSource: CreationSource;
  primaryImageUrl: string | null;
  originalImageUrl: string | null;
  enhancedImageUrl?: string | null;
  selectedBackground?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  color?: string;
  craft_type?: string;
  features?: string[];
  price: number;
  stock_quantity: number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  color?: string;
  craft_type?: string;
  features?: string[];
  price?: number;
  stock_quantity?: number;
}

export interface ProductStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
}
