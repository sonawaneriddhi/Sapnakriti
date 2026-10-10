import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSessionUser } from "@/lib/session";
import { createOrderSchema, firstError } from "@/lib/validations";
import { createPendingOrder } from "@/lib/services/order.service";
import { createRazorpayOrder } from "@/lib/services/payment.service";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to check out" }, { status: 401 });

  if (!rateLimit(`checkout:${user.id}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });

  // Prices, totals and stock come from the database. Anything price-like in the body is ignored.
  const result = await createPendingOrder({ userId: user.id, items: parsed.data.items, address: parsed.data.address });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const order = result.order;

  let razorpayOrderId: string;
  try {
    razorpayOrderId = await createRazorpayOrder(order);
  } catch (err) {
    console.error("Razorpay order creation failed", err);
    return NextResponse.json({ error: "Payment gateway is unavailable right now. Please try again." }, { status: 502 });
  }

  // Remember the delivery details for next time (first address only; the order keeps its own snapshot).
  if (parsed.data.saveAddress) {
    await connectDB();
    const a = parsed.data.address;
    await User.updateOne(
      { _id: user.id, "addresses.0": { $exists: false } },
      {
        $set: { phone: a.phone },
        $push: {
          addresses: {
            label: "Home",
            fullName: a.fullName,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            state: a.state,
            postalCode: a.postalCode,
            country: a.country,
            isDefault: true,
          },
        },
      }
    );
  }

  return NextResponse.json({
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    razorpayOrderId,
    amount: order.totalPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
