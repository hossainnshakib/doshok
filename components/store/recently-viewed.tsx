"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/store/product-card"
import { Eye } from "lucide-react"

const RECENTLY_VIEWED_KEY = "doshok_recently_viewed"
const MAX_ITEMS = 6

type ProductSummary = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  category?: { name: string; slug: string }
  variants: { stock: number }[]
}

function safeGet<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function safeSet<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch { /* quota */ }
}

export function trackRecentlyViewed(product: ProductSummary): void {
  const viewed = safeGet<ProductSummary>(RECENTLY_VIEWED_KEY)
  const filtered = viewed.filter((p) => p.id !== product.id)
  const updated = [product, ...filtered].slice(0, MAX_ITEMS)
  safeSet(RECENTLY_VIEWED_KEY, updated)
}

export function RecentlyViewed() {
  const [items, setItems] = useState<ProductSummary[]>([])

  useEffect(() => {
    setItems(safeGet<ProductSummary>(RECENTLY_VIEWED_KEY))
  }, [])

  if (items.length === 0) return null

  return (
    <section className="mt-10 pb-10">
      <div className="mb-5 flex items-center gap-2">
        <Eye className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-black">Recently Viewed</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-6">
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  )
}
