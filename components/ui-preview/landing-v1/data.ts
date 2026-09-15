export interface Product {
  id: string
  name: string
  price: number
  oldPrice?: number
  tagline: string
  details: string[]
  gradientFrom: string
  gradientTo: string
}

export const PRODUCTS: Product[] = [
  {
    id: "amethyst-aura",
    name: "Amethyst Aura",
    price: 850,
    oldPrice: 1100,
    tagline: "Rich purple elegance with delicate hand-finished embroidery",
    details: [
      "Premium cotton blend",
      "Hand-finished embroidery",
      "Relaxed flattering fit",
      "Perfect for weddings & events",
    ],
    gradientFrom: "#6d28d9",
    gradientTo: "#a78bfa",
  },
  {
    id: "royal-blue-flora",
    name: "Royal Blue Flora",
    price: 790,
    tagline: "Bold floral print on premium cotton",
    details: [
      "Premium cotton",
      "Vibrant floral print",
      "Comfortable relaxed fit",
      "Everyday elegance",
    ],
    gradientFrom: "#1d4ed8",
    gradientTo: "#60a5fa",
  },
  {
    id: "olive-petal-grace",
    name: "Olive Petal Grace",
    price: 790,
    tagline: "Soft olive tones with petal detailing",
    details: [
      "Soft cotton blend",
      "Petal detailing",
      "Flattering silhouette",
      "Versatile occasion wear",
    ],
    gradientFrom: "#4d7c0f",
    gradientTo: "#a3e635",
  },
]

export const OFFER_TIERS = [
  { minItems: 2, setPrice: 1500, label: "2-piece set" },
  { minItems: 3, setPrice: 2100, label: "3-piece set" },
]

export const DELIVERY_FEE = 120

export const REVIEW = {
  name: "Fatima K.",
  rating: 5,
  text: "Absolutely stunning. The fabric quality is incredible and the colour is even more beautiful in person. Got so many compliments!",
  date: "2 weeks ago",
}

export const FAQ_ITEMS = [
  {
    q: "What size is this outfit?",
    a: "Free Size — comfortably fits S to XL with a relaxed, flattering silhouette.",
  },
  {
    q: "How long does delivery take?",
    a: "Nationwide delivery in 3–5 business days. Dhaka orders typically arrive within 2 days.",
  },
  {
    q: "How do I pay?",
    a: "Cash on Delivery across Bangladesh. Pay when your order arrives.",
  },
]

export function getRegularTotal(ids: string[]): number {
  return ids.reduce((s, id) => s + (PRODUCTS.find((p) => p.id === id)?.price ?? 0), 0)
}

export function getSetPrice(ids: string[]): number {
  const count = ids.length
  if (count <= 1) return getRegularTotal(ids)
  const tier = [...OFFER_TIERS].reverse().find((t) => count >= t.minItems)
  return tier?.setPrice ?? getRegularTotal(ids)
}

export function getSavings(ids: string[]): number {
  return getRegularTotal(ids) - getSetPrice(ids)
}
