import { z } from 'zod';

export const extractedProductSchema = z.object({
  product_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  craft_type: z.string().nullable().optional(),
  features: z.array(z.string()).default([]),
  production_time: z.string().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  uncertain_fields: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([]),
});

export function sanitizeExtractedData(data: any) {
  const parsed = extractedProductSchema.parse(data);

  return {
    name: parsed.product_name?.trim() || 'Untitled Handcrafted Item',
    description: parsed.description?.trim() || '',
    category: parsed.category?.trim() || 'Handloom',
    subcategory: parsed.subcategory?.trim() || '',
    material: parsed.material?.trim() || '',
    color: parsed.color?.trim() || '',
    craft_type: parsed.craft_type?.trim() || '',
    features: Array.from(new Set(parsed.features.map((f) => f.trim()).filter(Boolean))),
    production_time: parsed.production_time?.trim() || null,
    keywords: Array.from(new Set(parsed.keywords.map((k) => k.trim()).filter(Boolean))),
  };
}
