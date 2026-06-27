"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductCard } from "@/components/store/product-card"
import { trackRecentlyViewed, RecentlyViewed } from "@/components/store/recently-viewed"
import { ProductReviews } from "@/components/store/product-reviews"
import { toast } from "sonner"
import { addToCart, validateStock } from "@/lib/cart"
import { trackEvent } from "@/lib/trakon"
import { cn } from "@/lib/utils"
import { LOW_STOCK_THRESHOLD } from "@/types"
import {
  Check,
  ChevronDown,
  ChevronRight,
  PackageCheck,
  Share2,
  ShoppingBag,
  Truck,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Star,
  Minus,
  Plus,
  ChevronUp,
} from "lucide-react"

type ProductWithVariants = {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  price: number
  oldPrice: number | null
  images: string[]
  variants: {
    id: string
    size: string
    color: string
    colorHex: string | null
    stock: number
    reservedStock: number
  }[]
  specifications?: {
    id: string
    label: string
    value: string
    position: number
  }[]
  material?: string | null
  careInstructions?: string | null
  category: { name: string; slug: string }
  defaultCouponCode?: string | null
  sizeCharts?: {
    sizeChart: {
      id: string
      name: string
      description?: string | null
      rows: {
        id: string
        label: string
        position: number
        measurements: Record<string, number> | null
      }[]
    }
  }[]
  averageRating?: number | null
  reviewCount?: number
}

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

function AccordionSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="pb-4 text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

export function ProductDetailClient({
  product,
  relatedProducts,
  crossSellProducts,
  upsellProducts,
}: {
  product: ProductWithVariants
  relatedProducts: ProductSummary[]
  crossSellProducts?: ProductSummary[]
  upsellProducts?: ProductSummary[]
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedImage, setSelectedImage] = useState(0)
  const firstAvailableVariant = product.variants.find((variant) => (variant.stock - variant.reservedStock) > 0) ?? product.variants[0]
  const [selectedSize, setSelectedSize] = useState(firstAvailableVariant?.size ?? "")
  const [selectedColor, setSelectedColor] = useState(firstAvailableVariant?.color ?? "")
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  const hasSizeCharts = product.sizeCharts && product.sizeCharts.length > 0

  useEffect(() => {
    trackRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      oldPrice: product.oldPrice,
      images: product.images,
      category: product.category,
      variants: product.variants,
    })
  }, [product])

  useEffect(() => {
    void trackEvent("ViewContent", {
      content_name: product.name,
      content_id: product.id,
      value: product.price,
      currency: "BDT",
      email: session?.user?.email,
      phone: session?.user?.phone,
    })
  }, [product.id, product.name, product.price, session?.user?.email, session?.user?.phone])

  const images = product.images.length > 0 ? product.images : []
  const sizes = [...new Set(product.variants.map((variant) => variant.size))]
  const colors = [...new Set(product.variants.map((variant) => variant.color))]

  const selectedVariant = product.variants.find(
    (variant) => variant.size === selectedSize && variant.color === selectedColor
  )
  const inStock = selectedVariant ? Math.max(0, selectedVariant.stock - selectedVariant.reservedStock) > 0 : true
  const totalStock = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock - variant.reservedStock), 0)
  const isSoldOut = totalStock === 0
  const selectedStock = selectedVariant ? Math.max(0, selectedVariant.stock - selectedVariant.reservedStock) : totalStock
  const isLowStock = selectedStock > 0 && selectedStock <= LOW_STOCK_THRESHOLD
  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  async function handleAddToCart() {
    if (!selectedSize || !selectedColor) {
      toast.error("Please select size and color")
      return
    }
    if (!inStock) {
      toast.error("This variant is out of stock")
      return
    }

    const result = await validateStock(product.id, selectedVariant?.id, quantity)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    const actualQty = result.capped
    if (result.cappedMessage) {
      toast.warning(result.cappedMessage)
    }

    addToCart({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      color: selectedColor,
      image: product.images[0],
      quantity: actualQty,
      slug: product.slug,
    })
    void trackEvent("AddToCart", {
      content_name: product.name,
      content_id: product.id,
      value: product.price * actualQty,
      currency: "BDT",
      quantity: actualQty,
      email: session?.user?.email,
      phone: session?.user?.phone,
    })
    window.dispatchEvent(new Event("cart-update"))
    setAddedToCart(true)
    toast.success(actualQty < quantity ? `Added ${actualQty} to cart` : "Added to cart")
    setTimeout(() => setAddedToCart(false), 2000)
  }

  async function handleBuyNow() {
    if (!selectedSize || !selectedColor) {
      toast.error("Please select size and color")
      return
    }
    if (!inStock) {
      toast.error("This variant is out of stock")
      return
    }

    const result = await validateStock(product.id, selectedVariant?.id, quantity)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    const params = new URLSearchParams({
      productId: product.id,
      variantId: selectedVariant?.id ?? "",
      quantity: String(result.capped),
      price: String(product.price),
      slug: product.slug,
      size: selectedSize,
      color: selectedColor,
    })
    if (product.defaultCouponCode) {
      params.set("coupon", product.defaultCouponCode)
    }
    void trackEvent("InitiateCheckout", {
      value: product.price * result.capped,
      currency: "BDT",
      content_ids: [product.id],
      email: session?.user?.email,
      phone: session?.user?.phone,
    })
    router.push(`/checkout?${params.toString()}`)
  }

  return (
    <div className="container mx-auto container-px py-4 md:py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground transition-colors">{product.category.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </nav>

      {/* Hero Section */}
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        {/* Left - Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
            {isSoldOut && (
              <Badge variant="destructive" className="absolute left-3 top-3 z-10 rounded-full shadow-sm">Sold Out</Badge>
            )}
            {isLowStock && selectedVariant && !isSoldOut && (
              <Badge variant="secondary" className="absolute left-3 top-3 z-10 rounded-full bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                Only {selectedStock} left
              </Badge>
            )}
            {!isSoldOut && discountPercent > 0 && (
              <Badge variant="secondary" className="absolute right-3 top-3 z-10 rounded-full bg-red-100 text-red-700 border-red-300 shadow-sm text-xs font-bold">
                -{discountPercent}%
              </Badge>
            )}
            {images[selectedImage] ? (
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                fetchPriority="high"
                className="object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <PackageCheck className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.slice(0, 6).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted transition-all md:h-16 md:w-16",
                    selectedImage === index
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <Image src={image} alt={`${product.name} ${index + 1}`} fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right - Purchase Panel */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{product.category.name}</p>
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight md:text-3xl">{product.name.trim()}</h1>
            {product.shortDescription && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{product.shortDescription}</p>
            )}
            {(product.reviewCount ?? 0) > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{Number(product.averageRating).toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground">({product.reviewCount})</span>
                <span className="text-muted-foreground/40">·</span>
                <span className={cn("font-medium", isSoldOut ? "text-red-500" : "text-emerald-600")}>
                  {isSoldOut ? "Out of stock" : `${totalStock} in stock`}
                </span>
              </div>
            )}
            {(!product.reviewCount || product.reviewCount === 0) && (
              <p className={cn("mt-2 text-sm font-medium", isSoldOut ? "text-red-500" : "text-emerald-600")}>
                {isSoldOut ? "Out of stock" : `${totalStock} in stock`}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-3xl font-black tracking-tight md:text-4xl">৳{product.price.toLocaleString()}</span>
            {product.oldPrice && (
              <>
                <span className="pb-0.5 text-sm font-bold text-muted-foreground line-through">৳{product.oldPrice.toLocaleString()}</span>
                <span className="pb-0.5 text-sm font-black text-emerald-600">-{discountPercent}%</span>
              </>
            )}
          </div>

          {product.defaultCouponCode && !isSoldOut && (
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
              Use coupon {product.defaultCouponCode} at checkout
            </p>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold">Color: <span className="text-muted-foreground font-normal">{selectedColor}</span></p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const variant = product.variants.find((item) => item.color === color)
                  const image = product.images[0]
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border bg-muted text-[10px] font-bold transition-all",
                        selectedColor === color ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                      )}
                      title={color}
                    >
                      {image ? (
                        <Image src={image} alt={color} fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="h-full w-full" style={{ backgroundColor: variant?.colorHex ?? "#e5e7eb" }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold">Size: <span className="text-muted-foreground font-normal">{selectedSize}</span></p>
                <Link href="/size-guide" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Size Guide
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((size) => {
                  const hasStock = product.variants.some(
                    (variant) => variant.size === size && Math.max(0, variant.stock - variant.reservedStock) > 0
                  )
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={!hasStock}
                      className={cn(
                        "h-9 min-w-[3rem] rounded-lg border px-3 text-xs font-bold transition-all",
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/40",
                        !hasStock && "cursor-not-allowed opacity-30 line-through"
                      )}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {isLowStock && selectedVariant && (
            <p className="text-xs font-bold text-amber-600">Only {selectedStock} left for this option.</p>
          )}
          {selectedSize && selectedColor && !inStock && (
            <p className="text-xs font-bold text-red-500">This combination is out of stock.</p>
          )}

          {/* Quantity */}
          <div>
            <p className="mb-2 text-xs font-bold">Quantity</p>
            <div className="flex w-fit items-center overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={isSoldOut || quantity <= 1}
                className="flex h-9 w-9 items-center justify-center text-sm transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="flex h-9 w-10 items-center justify-center border-x border-border text-sm font-bold tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(quantity + 1, selectedStock))}
                disabled={isSoldOut || quantity >= selectedStock}
                className="flex h-9 w-9 items-center justify-center text-sm transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Buy Now + Add to Cart */}
          <div className="space-y-2 pt-1">
            <Button size="lg" className="h-11 w-full rounded-xl text-sm font-black" onClick={handleBuyNow} disabled={isSoldOut}>
              {isSoldOut ? "Sold Out" : "Buy Now"}
            </Button>
            <Button size="lg" variant="outline" className="h-11 w-full rounded-xl border-primary text-sm font-black" onClick={handleAddToCart} disabled={isSoldOut}>
              {isSoldOut ? (
                "Sold Out"
              ) : addedToCart ? (
                <><Check className="mr-2 h-4 w-4" /> Added!</>
              ) : (
                <><ShoppingBag className="mr-2 h-4 w-4" /> Add to Bag</>
              )}
            </Button>
          </div>

          {/* Share / Wishlist */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toast.info("Wishlist will be available soon")}
              className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Wishlist
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/products/${product.slug}`
                const shareData = { title: product.name, url }
                if (navigator.share && navigator.canShare?.(shareData)) {
                  navigator.share(shareData).catch(() => {})
                } else {
                  navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.error("Failed to copy"))
                }
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: ShieldCheck, label: "Secure Checkout" },
              { icon: Truck, label: "Free Delivery" },
              { icon: RotateCcw, label: "Easy Returns" },
              { icon: PackageCheck, label: "COD Available" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-[10px] font-semibold leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Product Info Accordion */}
      <section className="mt-6 rounded-2xl border border-border/70 bg-background px-4 shadow-sm">
        <AccordionSection title="Description" defaultOpen>
          {product.description ? (
            <p className="whitespace-pre-wrap leading-relaxed">{product.description}</p>
          ) : (
            <p className="text-muted-foreground">No description available for this product.</p>
          )}
          {(product.material || product.careInstructions) && (
            <div className="mt-3 grid gap-2 text-sm border-t border-border/50 pt-3">
              {product.material && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">Material</span>
                  <span className="font-medium text-foreground">{product.material}</span>
                </div>
              )}
              {product.careInstructions && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">Care</span>
                  <span className="font-medium text-foreground">{product.careInstructions}</span>
                </div>
              )}
            </div>
          )}
        </AccordionSection>

        {product.specifications && product.specifications.length > 0 && (
          <AccordionSection title="Specifications">
            <div className="grid gap-2">
              {product.specifications.map((spec) => (
                <div key={spec.id} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <span className="text-muted-foreground">{spec.label}</span>
                  <span className="font-medium text-foreground">{spec.value}</span>
                </div>
              ))}
            </div>
          </AccordionSection>
        )}

        <AccordionSection title="Delivery & Returns">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Home Delivery</p>
                <p className="mt-0.5 text-xs leading-relaxed">We deliver nationwide. Delivery takes 2-5 business days. Charges vary by location.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Returns & Exchanges</p>
                <p className="mt-0.5 text-xs leading-relaxed">Items can be returned within 3 days of delivery. Must be unused with tags intact.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Cash on Delivery</p>
                <p className="mt-0.5 text-xs leading-relaxed">Pay when your order arrives. No advance payment needed.</p>
              </div>
            </div>
          </div>
        </AccordionSection>

        {hasSizeCharts && (
          <AccordionSection title="Size Guide">
            {product.sizeCharts!.map((sc) => {
              const allMeasurementKeys = new Set<string>()
              sc.sizeChart.rows.forEach((row) => {
                if (row.measurements) {
                  Object.keys(row.measurements).forEach((k) => allMeasurementKeys.add(k))
                }
              })
              const measurementKeys = Array.from(allMeasurementKeys)
              return (
                <div key={sc.sizeChart.id}>
                  <h3 className="text-sm font-bold text-foreground mb-1">{sc.sizeChart.name}</h3>
                  {sc.sizeChart.description && (
                    <p className="text-xs text-muted-foreground mb-3">{sc.sizeChart.description}</p>
                  )}
                  {measurementKeys.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-1.5 px-2 text-left font-bold text-foreground">Size</th>
                            {measurementKeys.map((key) => (
                              <th key={key} className="py-1.5 px-2 text-left font-bold text-foreground">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          {sc.sizeChart.rows
                            .filter((row) => row.label.trim())
                            .sort((a, b) => a.position - b.position)
                            .map((row) => (
                              <tr key={row.id} className="border-b border-border/50">
                                <td className="py-1.5 px-2 font-semibold text-foreground">{row.label}</td>
                                {measurementKeys.map((key) => (
                                  <td key={key} className="py-1.5 px-2">{row.measurements?.[key] ?? "—"}</td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No measurements available.</p>
                  )}
                </div>
              )
            })}
          </AccordionSection>
        )}
      </section>

      {/* Reviews */}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-black">Customer Reviews</h2>
        <ProductReviews productId={product.id} initialSummary={{ averageRating: product.averageRating ?? null, reviewCount: product.reviewCount ?? 0 }} />
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-base font-black">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
        </section>
      )}

      {/* Cross Sell */}
      {crossSellProducts && crossSellProducts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 text-base font-black">Pairs Well With</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {crossSellProducts.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
        </section>
      )}

      {/* Upsell */}
      {upsellProducts && upsellProducts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 text-base font-black">Upgrade Your Choice</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {upsellProducts.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} compact />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{product.name.trim()}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black">৳{product.price.toLocaleString()}</span>
              {product.oldPrice && (
                <span className="text-xs text-red-600 line-through">৳{product.oldPrice.toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-10 rounded-xl px-3 text-xs font-black"
              onClick={handleAddToCart}
              disabled={isSoldOut}
            >
              {addedToCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              className="h-10 rounded-xl px-4 text-xs font-black"
              onClick={handleBuyNow}
              disabled={isSoldOut}
            >
              {isSoldOut ? "Sold Out" : "Buy Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
