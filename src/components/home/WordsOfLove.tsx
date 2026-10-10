import { Star } from "lucide-react";
import { getApprovedReviews } from "@/lib/services/product.service";
import ReviewForm from "@/components/home/ReviewForm";

export default async function WordsOfLove({ signedIn }: { signedIn: boolean }) {
  // Only admin-approved reviews are shown. With none yet, the section shows an invitation instead of fake quotes.
  const reviews = await getApprovedReviews(6);

  return (
    <section id="words-of-love" className="bg-olive py-24 text-ivory" aria-labelledby="love-title">
      <div className="container-page">
        <div className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-sand">Kind notes from our customers</p>
          <h2 id="love-title" className="mt-3 text-4xl sm:text-5xl">
            Words of Love
          </h2>
        </div>

        {reviews.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="border border-ivory/20 p-7">
                <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={16} className={n <= r.rating ? "fill-sand text-sand" : "text-ivory/25"} />
                  ))}
                </div>
                <blockquote className="mt-4 font-serif text-xl leading-relaxed">“{r.message}”</blockquote>
                <p className="mt-5 text-xs uppercase tracking-[0.25em] text-sand">{r.customerName}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center font-serif text-xl text-ivory/80">Be the first to share a few kind words.</p>
        )}

        <div className="[&_.btn-outline]:border-ivory [&_.btn-outline]:text-ivory [&_.btn-outline:hover]:bg-ivory [&_.btn-outline:hover]:text-olive [&_.field]:text-espresso [&_p]:text-ivory/80">
          <ReviewForm signedIn={signedIn} />
        </div>
      </div>
    </section>
  );
}
