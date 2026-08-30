import { apiRequest } from './api.js';

export type CatalogueLanguage = 'en' | 'ta' | 'hi';
export type CatalogueStyle = 'PROFESSIONAL' | 'SIMPLE' | 'TRADITIONAL';

export interface GeneratedCatalogueContent {
  title: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  careInstructions: string;
  tags: string[];
}

export interface GenerateCatalogueResponse {
  message: string;
  productId?: string | null;
  language: CatalogueLanguage;
  style: CatalogueStyle;
  catalogue: GeneratedCatalogueContent;
  generatedBy: 'm63' | 'artisan';
}

/**
 * Call backend AI to generate smart catalogue content
 */
export async function generateCatalogue(
  productData: Record<string, any>,
  language: CatalogueLanguage = 'en',
  style: CatalogueStyle = 'PROFESSIONAL',
  section?: string,
  productId?: string
): Promise<GenerateCatalogueResponse> {
  return await apiRequest<GenerateCatalogueResponse>('/ai/generate-catalogue', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      productData,
      language,
      style,
      section,
    }),
  });
}

/**
 * Save or update catalogue content for a product and language
 */
export async function saveCatalogue(
  productId: string,
  language: CatalogueLanguage,
  catalogue: GeneratedCatalogueContent,
  style: CatalogueStyle = 'PROFESSIONAL',
  generatedBy: 'm63' | 'artisan' = 'm63'
): Promise<any> {
  return await apiRequest('/ai/save-catalogue', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      language,
      catalogue,
      style,
      generatedBy,
    }),
  });
}

export interface GetCatalogueResult {
  catalogues: Record<CatalogueLanguage, GeneratedCatalogueContent | null>;
  style: CatalogueStyle;
}

/**
 * Fetch all available multilingual catalogues for a product
 */
export async function getCatalogue(productId: string): Promise<GetCatalogueResult> {
  const res = await apiRequest<{ productId: string; catalogues: Record<CatalogueLanguage, any> }>(
    `/ai/catalogue/${productId}`,
    { method: 'GET' }
  );

  const map: Record<CatalogueLanguage, GeneratedCatalogueContent | null> = {
    en: null,
    ta: null,
    hi: null,
  };
  let detectedStyle: CatalogueStyle = 'PROFESSIONAL';

  if (res && res.catalogues) {
    if (res.catalogues.en) {
      map.en = {
        title: res.catalogues.en.title,
        shortDescription: res.catalogues.en.short_description,
        description: res.catalogues.en.description,
        highlights: res.catalogues.en.highlights || [],
        specifications: res.catalogues.en.specifications || {},
        careInstructions: res.catalogues.en.care_instructions || '',
        tags: res.catalogues.en.tags || [],
      };
      if (res.catalogues.en.tone_style) detectedStyle = res.catalogues.en.tone_style as CatalogueStyle;
    }
    if (res.catalogues.ta) {
      map.ta = {
        title: res.catalogues.ta.title,
        shortDescription: res.catalogues.ta.short_description,
        description: res.catalogues.ta.description,
        highlights: res.catalogues.ta.highlights || [],
        specifications: res.catalogues.ta.specifications || {},
        careInstructions: res.catalogues.ta.care_instructions || '',
        tags: res.catalogues.ta.tags || [],
      };
      if (res.catalogues.ta.tone_style) detectedStyle = res.catalogues.ta.tone_style as CatalogueStyle;
    }
    if (res.catalogues.hi) {
      map.hi = {
        title: res.catalogues.hi.title,
        shortDescription: res.catalogues.hi.short_description,
        description: res.catalogues.hi.description,
        highlights: res.catalogues.hi.highlights || [],
        specifications: res.catalogues.hi.specifications || {},
        careInstructions: res.catalogues.hi.care_instructions || '',
        tags: res.catalogues.hi.tags || [],
      };
      if (res.catalogues.hi.tone_style) detectedStyle = res.catalogues.hi.tone_style as CatalogueStyle;
    }
  }

  return { catalogues: map, style: detectedStyle };
}
