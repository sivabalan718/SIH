export type AssistantLanguage = 'en' | 'ta' | 'hi';

export type AssistantIntent =
  | 'SALES_SUMMARY'
  | 'TOP_PRODUCTS'
  | 'LOW_STOCK'
  | 'RECENT_ORDERS'
  | 'INVENTORY_SUMMARY'
  | 'PRODUCT_COUNT'
  | 'PRODUCT_DETAILS'
  | 'ORDER_SUMMARY'
  | 'CATEGORY_PERFORMANCE'
  | 'BUSINESS_ANALYTICS'
  | 'PRICING_GUIDANCE'
  | 'GENERAL_M63_HELP';

export interface AssistantQueryPayload {
  text?: string;
  language?: AssistantLanguage;
  pageContext?: string;
}

export interface BusinessDataResult {
  intent: AssistantIntent;
  period?: string;
  data: Record<string, any>;
  evidence: Array<{ metric: string; value: string }>;
}

export interface AssistantResponsePayload {
  transcript?: string;
  language: AssistantLanguage;
  intent: AssistantIntent;
  textResponse: string;
  audioDataUri?: string | null;
  businessData?: Record<string, any>;
  evidence?: Array<{ metric: string; value: string }>;
  suggestedQuestions?: string[];
}
