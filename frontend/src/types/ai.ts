import { Product } from './product.js';

export interface ExtractedProductData {
  product_name: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  material: string | null;
  color: string | null;
  craft_type: string | null;
  features: string[];
  production_time: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  keywords: string[];
  uncertain_fields: string[];
  missing_fields: string[];
  needs_clarification?: boolean;
  clarification_message?: string | null;
}

export interface VoiceToProductResponse {
  message: string;
  transcript: string;
  detectedLanguage: string;
  confidence: number;
  extractedData: ExtractedProductData;
  productDraft?: Product;
  targetField?: string;
  questionLanguage?: string;
  needsClarification?: boolean;
  clarificationMessage?: string | null;
}

export type ProcessingStage =
  | 'IDLE'
  | 'UPLOADING'
  | 'TRANSCRIBING'
  | 'EXTRACTING'
  | 'READY'
  | 'ERROR';
