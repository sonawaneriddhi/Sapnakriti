export const CATEGORIES = [
  { slug: "resin-work", label: "Resin Work", blurb: "Preserved florals, trays, coasters and keepsakes cast in resin." },
  { slug: "handcrafts", label: "Handcrafts", blurb: "Small objects shaped, stitched and finished by hand." },
  { slug: "candles", label: "Candles", blurb: "Small-batch soy candles, poured slowly and scented softly." },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function categoryLabel(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

/** Orders at or above this subtotal ship free (in paise). */
export const FREE_SHIPPING_THRESHOLD_PAISE = 99900;
/** Flat shipping fee below the threshold (in paise). */
export const SHIPPING_FEE_PAISE = 8000;
/** How long stock stays reserved while the customer pays. */
export const RESERVATION_MINUTES = 20;
/** Maximum quantity of one product per order. */
export const MAX_QTY_PER_ITEM = 10;

export function calcShipping(subtotalPaise: number) {
  if (subtotalPaise === 0) return 0;
  return subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : SHIPPING_FEE_PAISE;
}

export const ORDER_STATUS_FLOW = ["confirmed", "processing", "packed", "shipped", "delivered"] as const;
