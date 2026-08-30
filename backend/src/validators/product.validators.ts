import { z } from 'zod';

const VALID_CATEGORIES = [
  'Handloom', 'Handicraft', 'Pottery', 'Jewellery',
  'Woodcraft', 'Textiles', 'Home Decor', 'Traditional Art', 'Other',
] as const;

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional(),
  category: z
    .string()
    .trim()
    .optional(),
  subcategory: z
    .string()
    .trim()
    .max(50, 'Subcategory cannot exceed 50 characters')
    .optional(),
  material: z
    .string()
    .trim()
    .max(100, 'Material cannot exceed 100 characters')
    .optional(),
  color: z
    .string()
    .trim()
    .max(100, 'Color cannot exceed 100 characters')
    .optional(),
  craft_type: z
    .string()
    .trim()
    .max(100, 'Craft type cannot exceed 100 characters')
    .optional(),
  features: z
    .array(z.string().trim().max(100))
    .max(20, 'Cannot have more than 20 features')
    .optional(),
  price: z
    .number({ required_error: 'Price is required' })
    .min(0, 'Price cannot be negative')
    .max(9999999999, 'Price is too large'),
  stock_quantity: z
    .number({ required_error: 'Stock quantity is required' })
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity cannot be negative')
    .max(999999, 'Stock quantity is too large'),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name cannot exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional(),
  category: z
    .string()
    .trim()
    .optional(),
  subcategory: z
    .string()
    .trim()
    .max(50, 'Subcategory cannot exceed 50 characters')
    .optional(),
  material: z
    .string()
    .trim()
    .max(100, 'Material cannot exceed 100 characters')
    .optional(),
  color: z
    .string()
    .trim()
    .max(100, 'Color cannot exceed 100 characters')
    .optional(),
  craft_type: z
    .string()
    .trim()
    .max(100, 'Craft type cannot exceed 100 characters')
    .optional(),
  features: z
    .array(z.string().trim().max(100))
    .max(20, 'Cannot have more than 20 features')
    .optional(),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(9999999999, 'Price is too large')
    .optional(),
  stock_quantity: z
    .number()
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity cannot be negative')
    .max(999999, 'Stock quantity is too large')
    .optional(),
});

export { VALID_CATEGORIES };
