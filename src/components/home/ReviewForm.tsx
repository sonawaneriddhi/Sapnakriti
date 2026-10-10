"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export default function ReviewForm({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, message }),
    });
    if (res.ok) {
      setState("done");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not send your review");
    setState("idle");
  }

  if (state === "done") {
    return <p className="mt-10 text-center font-serif text-xl text-olive">Thank you! Your words will appear once we've had a look.</p>;
  }

  return (
    <div className="mt-10 text-center">
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-outline">
          Share your words
        </button>
      ) : !signedIn ? (
        <p className="text-sm text-espresso/70">
          Please <a className="text-terracotta underline" href="/login?callbackUrl=/%23words-of-love">sign in</a> to leave a review.
        </p>
      ) : (
        <form onSubmit={submit} className="mx-auto max-w-lg space-y-4 text-left">
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={n <= rating}>
                <Star size={26} className={n <= rating ? "fill-terracotta text-terracotta" : "text-sand"} />
              </button>
            ))}
          </div>
          <textarea
            required
            minLength={5}
            maxLength={600}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you loved…"
            className="field"
          />
          {error && <p className="text-sm text-terracotta">{error}</p>}
          <button disabled={state === "sending"} className="btn-primary">
            {state === "sending" ? "Sending…" : "Send review"}
          </button>
        </form>
      )}
    </div>
  );
}
