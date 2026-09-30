import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  confirmPassword: z
    .string({ required_error: 'Password confirmation is required' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'Email or M63 ID is required' })
    .trim()
    .min(1, 'Please enter your Email or M63 ID'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Please enter your password'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
});

/* ---------------- Customer accounts ---------------- */
const indianMobile = z
  .string({ required_error: 'Mobile number is required for delivery and order updates' })
  .transform((v) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');
const pinCode = z.string().trim().regex(/^\d{6}$/, 'PIN code must be 6 digits');
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const customerRegisterSchema = z.object({
  name: z.string({ required_error: 'Full name is required' }).trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
  mobile: indianMobile,
  address: z.string().trim().min(8, 'Enter house number, street and area').max(300).optional().or(z.literal('').transform(() => undefined)),
  locality: optionalText(120),
  city: optionalText(80),
  district: optionalText(80),
  state: optionalText(80),
  postalCode: pinCode.optional().or(z.literal('').transform(() => undefined)),
  preferredLanguage: z.enum(['en', 'ta', 'hi']).optional(),
});

export const customerProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  mobile: indianMobile.optional(),
  address: optionalText(300),
  locality: optionalText(120),
  city: optionalText(80),
  district: optionalText(80),
  state: optionalText(80),
  postalCode: pinCode.optional().or(z.literal('').transform(() => undefined)),
  preferredLanguage: z.enum(['en', 'ta', 'hi']).optional(),
});
