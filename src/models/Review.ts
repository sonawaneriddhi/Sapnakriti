import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, maxlength: 600 },
    isApproved: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type ReviewDoc = InferSchemaType<typeof ReviewSchema>;

const Review: Model<ReviewDoc> =
  (mongoose.models.Review as Model<ReviewDoc>) || mongoose.model<ReviewDoc>("Review", ReviewSchema);
export default Review;
