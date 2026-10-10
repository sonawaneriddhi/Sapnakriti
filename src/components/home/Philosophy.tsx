const values = [
  { title: "Small batch", text: "Every candle, tray and trinket is made in limited runs, so each piece gets our full attention." },
  { title: "Honest materials", text: "Soy wax, botanical florals, clay and cotton, chosen for how they feel and how gently they age." },
  { title: "Made by hand", text: "No assembly lines. Each object carries the small, lovely imperfections of the person who made it." },
];

export default function Philosophy() {
  return (
    <section className="bg-sand/40 py-24" aria-labelledby="philosophy-title">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Our philosophy</p>
          <h2 id="philosophy-title" className="mt-4 text-4xl leading-tight sm:text-5xl">
            Slow things, made with <em className="text-terracotta">intention.</em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-espresso/75">
            SAPNAKRITI began with a simple idea: the objects around us should feel like they mean something. We make candles, resin art and handcrafted pieces
            for homes, gifts and quiet moments, slowly, in small batches, and never in a hurry.
          </p>
        </div>
        <ul className="space-y-8">
          {values.map((v, i) => (
            <li key={v.title} className="flex gap-6 border-t border-olive/20 pt-6">
              <span className="font-serif text-3xl text-sage">0{i + 1}</span>
              <div>
                <h3 className="font-serif text-2xl">{v.title}</h3>
                <p className="mt-1.5 text-espresso/70">{v.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
