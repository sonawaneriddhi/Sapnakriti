import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const InventoryLogSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  action: { type: String, enum: ["restock", "reserve", "release", "sale", "adjustment"], required: true },
  quantityChange: { type: Number, required: true },
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  reason: { type: String, default: "" },
  actorName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true },
});

export type InventoryLogDoc = InferSchemaType<typeof InventoryLogSchema>;

const InventoryLog: Model<InventoryLogDoc> =
  (mongoose.models.InventoryLog as Model<InventoryLogDoc>) ||
  mongoose.model<InventoryLogDoc>("InventoryLog", InventoryLogSchema);
export default InventoryLog;
