import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import ReviewsTable, { type ReviewRow } from "@/components/admin/ReviewsTable";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  await connectDB();
  const reviews = await Review.find().sort({ isApproved: 1, createdAt: -1 }).limit(200).lean();
  const rows: ReviewRow[] = reviews.map((r) => ({
    id: String(r._id),
    customerName: r.customerName,
    rating: r.rating,
    message: r.message,
    isApproved: r.isApproved,
    createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? "",
  }));
  return (
    <div>
      <h1 className="text-4xl">Reviews</h1>
      <p className="mt-2 text-sm text-espresso/60">Only approved reviews appear in “Words of Love” on the homepage.</p>
      <ReviewsTable rows={rows} />
    </div>
  );
}
