import Link from "next/link";
import { CATEGORIES } from "@/lib/config";

const tones: Record<string, string> = {
  "resin-work": "from-sage/70 via-sage/40 to-sand/60",
  handcrafts: "from-terracotta/70 via-terracotta/40 to-sand/70",
  candles: "from-olive/80 via-olive/50 to-sage/50",
};

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="container-page pb-10 pt-14 text-center sm:pt-20">
        <p className="eyebrow">Handmade with intention</p>
        <h1 id="hero-title" className="mx-auto mt-5 max-w-3xl text-5xl font-medium leading-[1.05] sm:text-7xl">
          Objects with a <em className="text-terracotta">soul.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-espresso/70">Small-batch candles, resin art &amp; handcrafted treasures.</p>
      </div>

      <div className="container-page grid gap-4 pb-6 sm:grid-cols-3 sm:gap-6">
        {CATEGORIES.map((c, i) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className={`group relative flex aspect-[4/5] flex-col justify-end overflow-hidden bg-gradient-to-br p-7 sm:aspect-[3/4] ${tones[c.slug]}`}
          >
            <span aria-hidden className="absolute right-5 top-4 font-serif text-8xl font-light text-ivory/30 transition duration-500 group-hover:scale-110">
              0{i + 1}
            </span>
            <div className="relative">
              <h2 className="font-serif text-4xl text-ivory sm:text-3xl lg:text-4xl">{c.label}</h2>
              <p className="mt-2 max-w-[16rem] text-sm text-ivory/85">{c.blurb}</p>
              <span className="mt-5 inline-block border-b border-ivory pb-0.5 text-xs uppercase tracking-[0.25em] text-ivory transition group-hover:border-terracotta group-hover:text-terracotta">
                Shop now
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
