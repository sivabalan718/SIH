export interface SpeechResult {
  transcript: string;
  detectedLanguage: string; // e.g. 'Tamil', 'Hindi', 'English'
  confidence: number;       // 0 to 1
}

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
  target_field?: string | null;
}

export interface SpeechProvider {
  name: string;
  transcribe(audioBuffer: Buffer, mimeType: string, browserTranscript?: string): Promise<SpeechResult>;
}

export interface ProductUnderstandingProvider {
  name: string;
  extractProductData(
    transcript: string,
    detectedLanguage: string,
    targetField?: string,
    questionLanguage?: string
  ): Promise<ExtractedProductData>;
}

export interface VoiceToProductProcessResult {
  transcript: string;
  detectedLanguage: string;
  confidence: number;
  extractedData: ExtractedProductData;
  targetField?: string;
  questionLanguage?: string;
}
