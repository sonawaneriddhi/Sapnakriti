import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import Order from "@/models/Order";
import User from "@/models/User";
import { getSessionUser } from "@/lib/session";
import { reviewInputSchema, firstError } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

// Customers who have a paid order can leave a review; it appears publicly only after admin approval.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to leave a review" }, { status: 401 });
  if (!rateLimit(`review:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many reviews, try again later" }, { status: 429 });
  }

  const parsed = reviewInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });

  await connectDB();
  const order = await Order.findOne({ userId: user.id, paymentStatus: "paid" }).select("_id").sort({ createdAt: -1 });
  if (!order) return NextResponse.json({ error: "Reviews are open to customers who have placed an order" }, { status: 403 });

  const dbUser = await User.findById(user.id).select("name");
  await Review.create({
    userId: user.id,
    orderId: order._id,
    customerName: dbUser?.name ?? "Customer",
    rating: parsed.data.rating,
    message: parsed.data.message,
    isApproved: false,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
