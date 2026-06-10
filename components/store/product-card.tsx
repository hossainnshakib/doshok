import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PackageCheck } from "lucide-react"
import { LOW_STOCK_THRESHOLD } from "@/types"

type ProductCardProps = {
  product: {
    id: string
    name: string
    slug: string
    price: number
    oldPrice: number | null
    images: string[]
    category?: { name: string; slug: string }
    variants: { stock: number }[]
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
  const image = product.images[0]
  const isSoldOut = totalStock === 0
  const isLowStock = !isSoldOut && totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD
  const hasDiscount = Boolean(product.oldPrice && product.oldPrice > product.price)
  const discountPercent = hasDiscount && product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group block overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-sm shadow-black/[0.02] transition-all duration-500 hover:-translate-y-1.5 hover:border-border hover:shadow-lg hover:shadow-black/10 ${isSoldOut ? "opacity-70" : ""}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-muted to-muted/40">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <PackageCheck className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        {isSoldOut && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="destructive" className="rounded-full text-[10px] px-2.5 py-0.5 font-medium tracking-wide uppercase shadow-sm">
              Sold Out
            </Badge>
          </div>
        )}
        {!isSoldOut && hasDiscount && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="secondary" className="rounded-full bg-red-50 text-red-600 border-red-200 text-[10px] px-2.5 py-0.5 font-medium shadow-sm">
              -{discountPercent}%
            </Badge>
          </div>
        )}
        {isLowStock && !isSoldOut && !hasDiscount && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-2.5 py-0.5 font-medium shadow-sm">
              Low Stock
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3 md:p-3.5">
        {product.category && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <h3 className="line-clamp-2 min-h-[2.3rem] text-sm font-semibold leading-snug tracking-tight md:text-[15px]">{product.name}</h3>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          <span>{totalStock > 0 ? `${totalStock} in stock` : "Sold out"}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <span className="text-base font-black tracking-tight md:text-lg">৳{product.price.toLocaleString()}</span>
          {hasDiscount && product.oldPrice && (
            <span className="text-xs font-medium text-red-400 line-through">
              ৳{product.oldPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
