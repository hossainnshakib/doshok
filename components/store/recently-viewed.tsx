"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/store/product-card"
import { Eye } from "lucide-react"

const RECENTLY_VIEWED_KEY = "doshok_recently_viewed"
const MAX_ITEMS = 8

type ProductSummary = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  category?: { name: string; slug: string }
  variants: { stock: number; reservedStock: number }[]
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
      <div className="mb-4 flex items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-black">Recently Viewed</h2>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-none">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="w-36 shrink-0 sm:w-40">
              <ProductCard product={item} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
