import { z } from "zod";
import { CATEGORY_SLUGS, MAX_QTY_PER_ITEM } from "@/lib/config";
import { normalizeIndianPhone } from "@/lib/utils";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => normalizeIndianPhone(v) !== null, "Enter a valid 10-digit Indian mobile number")
  .transform((v) => normalizeIndianPhone(v) as string);

export const postalCodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use at least one letter and one number"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email(),
  line1: z.string().trim().min(3).max(150),
  line2: z.string().trim().max(150).optional().default(""),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  postalCode: postalCodeSchema,
  country: z.string().trim().default("India"),
});

export const cartItemsSchema = z
  .array(z.object({ productId: objectId, quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM) }))
  .min(1, "Your cart is empty")
  .max(30);

export const createOrderSchema = z.object({
  items: cartItemsSchema,
  address: addressSchema,
  saveAddress: z.boolean().optional().default(true),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().min(10),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).default(""),
  category: z.enum(CATEGORY_SLUGS),
  // The admin form works in rupees; the server converts to paise.
  priceRupees: z.number().positive().max(1_000_000),
  compareAtRupees: z.number().positive().max(1_000_000).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(100000),
  lowStockThreshold: z.number().int().min(0).max(1000).default(3),
  images: z
    .array(z.object({ url: z.string().url(), publicId: z.string().default(""), alt: z.string().default("") }))
    .max(8)
    .default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isMostAdored: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
});

export const inventoryAdjustSchema = z.object({
  productId: objectId,
  mode: z.enum(["restock", "set"]),
  quantity: z.number().int().min(0).max(100000),
  reason: z.string().trim().max(200).default(""),
});

export const orderUpdateSchema = z.object({
  orderStatus: z.enum(["processing", "packed", "shipped", "delivered"]).optional(),
  courierName: z.string().trim().max(60).optional(),
  courierTrackingNumber: z.string().trim().max(80).optional(),
});

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(5).max(600),
});

export function firstError(err: z.ZodError) {
  const issue = err.issues[0];
  return issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid input";
}
