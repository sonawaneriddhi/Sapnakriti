import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CATEGORY_SLUGS } from "@/lib/config";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    category: { type: String, enum: CATEGORY_SLUGS, required: true, index: true },
    pricePaise: { type: Number, required: true, min: 0 },
    compareAtPricePaise: { type: Number, min: 0 },
    images: {
      type: [{ url: String, publicId: String, alt: String }],
      default: [],
    },
    stockQuantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 3, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    isMostAdored: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", description: "text", tags: "text" });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) || mongoose.model<ProductDoc>("Product", ProductSchema);
export default Product;

export function availableOf(p: { stockQuantity: number; reservedQuantity: number }) {
  return Math.max(0, p.stockQuantity - p.reservedQuantity);
}
