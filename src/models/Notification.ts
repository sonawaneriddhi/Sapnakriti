import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Persistent outbox: payment confirmation never depends on an email/WhatsApp provider being up.
const NotificationSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    channel: { type: String, enum: ["email", "whatsapp"], required: true },
    status: { type: String, enum: ["pending", "processing", "sent", "failed"], default: "pending", index: true },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: Date,
    lastError: String,
    sentAt: Date,
  },
  { timestamps: true }
);

// One confirmation per channel per order, so duplicate webhooks cannot double-send.
NotificationSchema.index({ orderId: 1, channel: 1 }, { unique: true });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;

const Notification: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc>) ||
  mongoose.model<NotificationDoc>("Notification", NotificationSchema);
export default Notification;
