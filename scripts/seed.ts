// Optional sample catalogue so the homepage isn't empty during development.
//   npm run seed
import mongoose from "mongoose";
import Product from "../src/models/Product";

const samples = [
  { name: "Amber Dusk Soy Candle", category: "candles", price: 599, featured: true, adored: true, stock: 24, desc: "Hand-poured soy wax with notes of amber, warm vanilla and cedar. 40 hour burn time." },
  { name: "Wild Jasmine Jar Candle", category: "candles", price: 549, featured: true, adored: false, stock: 18, desc: "A soft floral candle poured in a reusable glass jar." },
  { name: "Sandalwood Pillar Candle", category: "candles", price: 799, featured: false, adored: true, stock: 12, desc: "A slow-burning pillar with deep sandalwood and a hint of smoke." },
  { name: "Pressed Marigold Resin Coaster Set", category: "resin-work", price: 1199, featured: true, adored: true, stock: 10, desc: "Set of four coasters with real pressed marigolds set in clear resin." },
  { name: "Ocean Wave Resin Tray", category: "resin-work", price: 1899, featured: true, adored: false, stock: 6, desc: "Serving tray with a hand-poured ocean wave in sage and sand tones." },
  { name: "Gold-Fleck Keepsake Dish", category: "resin-work", price: 749, featured: false, adored: true, stock: 15, desc: "Small trinket dish with gold leaf flecks." },
  { name: "Macrame Plant Hanger", category: "handcrafts", price: 649, featured: true, adored: false, stock: 20, desc: "Hand-knotted cotton cord plant hanger." },
  { name: "Hand-Painted Terracotta Diya Set", category: "handcrafts", price: 449, featured: false, adored: true, stock: 30, desc: "Set of six diyas painted by hand in earthy tones." },
] as const;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-");
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing (is .env.local filled in?)");
  await mongoose.connect(process.env.MONGODB_URI);
  for (const s of samples) {
    await Product.updateOne(
      { slug: slugify(s.name) },
      {
        $setOnInsert: {
          name: s.name,
          slug: slugify(s.name),
          description: s.desc,
          category: s.category,
          pricePaise: s.price * 100,
          stockQuantity: s.stock,
          reservedQuantity: 0,
          isActive: true,
          isFeatured: s.featured,
          isMostAdored: s.adored,
          images: [],
          tags: [],
        },
      },
      { upsert: true }
    );
  }
  console.log(`Seeded ${samples.length} sample products (existing ones untouched).`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
