import type { Types } from "mongoose";
import Product from "@/models/Product";
import InventoryLog from "@/models/InventoryLog";

export type StockItem = { productId: Types.ObjectId | string; quantity?: number | null };

// InventoryLog.previousQuantity / newQuantity record `reservedQuantity` for reserve/release
// entries, and `stockQuantity` for sale / restock / adjustment entries.

async function writeLog(entry: {
  productId: Types.ObjectId | string;
  orderId?: Types.ObjectId | string;
  action: "restock" | "reserve" | "release" | "sale" | "adjustment";
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  actorName?: string;
}) {
  await InventoryLog.create(entry);
}

/**
 * Atomically reserve stock for every item. Each reservation is a single conditional
 * update (available >= qty), so stock can never go negative even under concurrent checkouts.
 * If any item fails, the earlier reservations are rolled back.
 */
export async function reserveItems(items: StockItem[], orderId: Types.ObjectId | string) {
  const done: { productId: Types.ObjectId | string; qty: number }[] = [];

  for (const item of items) {
    const qty = item.quantity ?? 0;
    const before = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        isActive: true,
        $expr: { $gte: [{ $subtract: ["$stockQuantity", "$reservedQuantity"] }, qty] },
      },
      { $inc: { reservedQuantity: qty } },
      { new: false }
    );

    if (!before) {
      for (const d of done) await releaseOne(d.productId, d.qty, orderId, "Rolled back: another item was unavailable");
      const p = await Product.findById(item.productId).select("name").lean();
      return { ok: false as const, productName: p?.name ?? "An item" };
    }

    done.push({ productId: item.productId, qty });
    await writeLog({
      productId: item.productId,
      orderId,
      action: "reserve",
      quantityChange: qty,
      previousQuantity: before.reservedQuantity,
      newQuantity: before.reservedQuantity + qty,
      reason: "Reserved at checkout",
    });
  }
  return { ok: true as const };
}

async function releaseOne(productId: Types.ObjectId | string, qty: number, orderId: Types.ObjectId | string, reason: string) {
  const before = await Product.findOneAndUpdate(
    { _id: productId, reservedQuantity: { $gte: qty } },
    { $inc: { reservedQuantity: -qty } },
    { new: false }
  );
  if (before) {
    await writeLog({
      productId,
      orderId,
      action: "release",
      quantityChange: -qty,
      previousQuantity: before.reservedQuantity,
      newQuantity: before.reservedQuantity - qty,
      reason,
    });
  }
}

export async function releaseItems(items: StockItem[], orderId: Types.ObjectId | string, reason: string) {
  for (const item of items) await releaseOne(item.productId, item.quantity ?? 0, orderId, reason);
}

/** Turn a reservation into a sale: stock on hand and reserved both drop by qty. */
export async function commitItems(items: StockItem[], orderId: Types.ObjectId | string) {
  let allOk = true;
  for (const item of items) {
    const qty = item.quantity ?? 0;
    const before = await Product.findOneAndUpdate(
      { _id: item.productId, reservedQuantity: { $gte: qty }, stockQuantity: { $gte: qty } },
      { $inc: { stockQuantity: -qty, reservedQuantity: -qty } },
      { new: false }
    );
    if (!before) {
      allOk = false;
      continue;
    }
    await writeLog({
      productId: item.productId,
      orderId,
      action: "sale",
      quantityChange: -qty,
      previousQuantity: before.stockQuantity,
      newQuantity: before.stockQuantity - qty,
      reason: "Paid order",
    });
  }
  return allOk;
}

/** Admin restock (add units) or stock-take (set absolute on-hand quantity). */
export async function adjustStock(opts: {
  productId: string;
  mode: "restock" | "set";
  quantity: number;
  reason: string;
  actor: string;
}) {
  if (opts.mode === "restock") {
    const before = await Product.findOneAndUpdate({ _id: opts.productId }, { $inc: { stockQuantity: opts.quantity } }, { new: false });
    if (!before) return null;
    await writeLog({
      productId: opts.productId,
      action: "restock",
      quantityChange: opts.quantity,
      previousQuantity: before.stockQuantity,
      newQuantity: before.stockQuantity + opts.quantity,
      reason: opts.reason || "Restock",
      actorName: opts.actor,
    });
    return Product.findById(opts.productId);
  }

  // "set": never drop on-hand below what is currently reserved by open checkouts.
  const current = await Product.findById(opts.productId);
  if (!current) return null;
  if (opts.quantity < current.reservedQuantity) {
    throw new Error(`Cannot set below ${current.reservedQuantity} units that are reserved by open checkouts`);
  }
  const before = await Product.findOneAndUpdate(
    { _id: opts.productId, reservedQuantity: { $lte: opts.quantity } },
    { $set: { stockQuantity: opts.quantity } },
    { new: false }
  );
  if (!before) throw new Error("Stock changed while updating, please retry");
  await writeLog({
    productId: opts.productId,
    action: "adjustment",
    quantityChange: opts.quantity - before.stockQuantity,
    previousQuantity: before.stockQuantity,
    newQuantity: opts.quantity,
    reason: opts.reason || "Stock count adjustment",
    actorName: opts.actor,
  });
  return Product.findById(opts.productId);
}
