import { auth } from "@/lib/auth";
import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Philosophy from "@/components/home/Philosophy";
import MostAdored from "@/components/home/MostAdored";
import WordsOfLove from "@/components/home/WordsOfLove";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <Philosophy />
      <MostAdored />
      <WordsOfLove signedIn={!!session?.user?.id} />
    </>
  );
}
