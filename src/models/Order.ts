import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: String,
        productSlug: String,
        imageUrl: String,
        unitPricePaise: Number,
        quantity: Number,
        lineTotalPaise: Number,
        _id: false,
      },
    ],
    deliveryAddress: {
      fullName: String,
      phone: String,
      email: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    subtotalPaise: { type: Number, required: true },
    shippingPaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending", index: true },
    orderStatus: {
      type: String,
      enum: ["pending_payment", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"],
      default: "pending_payment",
      index: true,
    },
    // Where the stock for this order currently is: held (reserved), committed (sold), released (given back).
    stockState: { type: String, enum: ["held", "committed", "released"], default: "held" },
    reservationExpiresAt: Date,
    // Unique only once set (assigned after verified payment).
    packingCode: { type: String, unique: true, sparse: true },
    invoiceNumber: { type: String, unique: true, sparse: true },
    invoiceUrl: String,
    courierTrackingNumber: String,
    courierName: String,
    paidAt: Date,
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof OrderSchema>;

const Order: Model<OrderDoc> = (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", OrderSchema);
export default Order;
