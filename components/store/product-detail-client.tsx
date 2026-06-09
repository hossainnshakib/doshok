"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProductCard } from "@/components/store/product-card"
import { trackRecentlyViewed, RecentlyViewed } from "@/components/store/recently-viewed"
import { toast } from "sonner"
import { addToCart, validateStock } from "@/lib/cart"
import { cn } from "@/lib/utils"
import { LOW_STOCK_THRESHOLD } from "@/types"
import {
  Check,
  ChevronRight,
  Heart,
  MessageCircle,
  PackageCheck,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react"

type ProductWithVariants = {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  oldPrice: number | null
  images: string[]
  variants: {
    id: string
    size: string
    color: string
    colorHex: string | null
    stock: number
  }[]
  category: { name: string; slug: string }
  defaultCouponCode?: string | null
}

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

export function ProductDetailClient({
  product,
  relatedProducts,
}: {
  product: ProductWithVariants
  relatedProducts: ProductSummary[]
}) {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState(0)
  const firstAvailableVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0]
  const [selectedSize, setSelectedSize] = useState(firstAvailableVariant?.size ?? "")
  const [selectedColor, setSelectedColor] = useState(firstAvailableVariant?.color ?? "")
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

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

  const images = product.images.length > 0 ? product.images : []
  const sizes = [...new Set(product.variants.map((variant) => variant.size))]
  const colors = [...new Set(product.variants.map((variant) => variant.color))]

  const selectedVariant = product.variants.find(
    (variant) => variant.size === selectedSize && variant.color === selectedColor
  )
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)
  const isSoldOut = totalStock === 0
  const selectedStock = selectedVariant?.stock ?? totalStock
  const isLowStock = selectedStock > 0 && selectedStock <= LOW_STOCK_THRESHOLD
  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0
  const bundleProducts = [product, ...relatedProducts].slice(0, 4)
  const bundleTotal = bundleProducts.reduce((sum, item) => sum + item.price, 0)
  const bundleOldTotal = bundleProducts.reduce((sum, item) => sum + (item.oldPrice ?? item.price), 0)

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
    router.push(`/checkout?${params.toString()}`)
  }

  return (
    <div className="container mx-auto container-px py-5 md:py-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/products" className="hover:text-foreground transition-colors">Product</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-foreground transition-colors">{product.category.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </div>

      {/* Main section */}
      <section className="grid gap-5 rounded-[1.5rem] border border-border/70 bg-background p-4 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
        {/* Image gallery */}
        <div>
          <div className="grid gap-3 md:grid-cols-[72px_1fr]">
            <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
              {(images.length > 0 ? images : [undefined, undefined, undefined, undefined]).slice(0, 5).map((image, index) => (
                <button
                  key={`${image ?? "placeholder"}-${index}`}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted transition-all md:h-[72px] md:w-[72px]",
                    selectedImage === index ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-primary/40"
                  )}
                  aria-label={`View product image ${index + 1}`}
                >
                  {image ? (
                    <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <ProductImagePlaceholder small />
                  )}
                </button>
              ))}
            </div>

            <div className="order-1 relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-muted md:order-2">
              {isSoldOut && (
                <Badge variant="destructive" className="absolute left-4 top-4 z-10 rounded-full shadow-sm">Sold Out</Badge>
              )}
              {isLowStock && selectedVariant && !isSoldOut && (
                <Badge variant="secondary" className="absolute left-4 top-4 z-10 rounded-full bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                  Only {selectedStock} left
                </Badge>
              )}
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} className="h-full w-full object-cover transition-opacity duration-300" />
              ) : (
                <ProductImagePlaceholder />
              )}
              <button
                className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-95"
                aria-label="Zoom product image"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quality promise */}
          <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-black">
                  DS
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black">Doshok Quality Promise</p>
                    <Badge className="rounded-full bg-blue-50 text-blue-600 hover:bg-blue-50">Verified</Badge>
                  </div>
                  <p className="text-xs font-medium text-green-600">Single-brand official catalog</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/delivery" className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground">
                  Delivery Info
                </Link>
                <Link href="/return-policy" className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground">
                  Exchange Policy
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:grid-cols-3">
              <span className="flex items-center gap-2"><PackageCheck className="h-3.5 w-3.5" /> Quality Checked: <strong className="text-foreground">Yes</strong></span>
              <span className="flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Ships From: <strong className="text-foreground">Chattogram</strong></span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Checkout: <strong className="text-foreground">OTP + COD</strong></span>
            </div>
          </div>
        </div>

        {/* Product info sidebar */}
        <aside className="space-y-5 lg:pl-5">
          <div>
            <h1 className="text-2xl font-black leading-tight tracking-[-0.03em] md:text-4xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("font-bold", isSoldOut ? "text-red-500" : "text-foreground")}>
                {isSoldOut ? "Sold out" : `${totalStock} in stock`}
              </span>
              <span>·</span>
              <Link href={`/products?category=${product.category.slug}`} className="font-bold text-foreground hover:underline">
                {product.category.name}
              </Link>
            </div>
          </div>

          {/* Price */}
          <div>
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black tracking-[-0.04em]">৳{product.price.toLocaleString()}</span>
              {product.oldPrice && (
                <>
                  <span className="pb-1 text-sm font-bold text-red-400 line-through">৳{product.oldPrice.toLocaleString()}</span>
                  <span className="pb-1 text-sm font-black text-emerald-600">{discountPercent}% off</span>
                </>
              )}
            </div>
            {product.defaultCouponCode && !isSoldOut && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                <Zap className="h-3.5 w-3.5" /> Use coupon {product.defaultCouponCode} at checkout
              </p>
            )}
          </div>

          {/* Colors */}
          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-black">Select Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const variant = product.variants.find((item) => item.color === color)
                  const image = product.images[0]
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border bg-muted text-[10px] font-bold transition-all",
                        selectedColor === color ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-primary/40"
                      )}
                      title={color}
                    >
                      {image ? (
                        <img src={image} alt={color} className="h-full w-full object-cover" />
                      ) : (
                        <span
                          className="h-full w-full"
                          style={{ backgroundColor: variant?.colorHex ?? "#e5e7eb" }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sizes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black">Select Size</p>
              <Link href="/size-guide" className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">Size Guide</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const hasStock = product.variants.some(
                  (variant) => variant.size === size && variant.stock > 0
                )
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={!hasStock}
                    className={cn(
                      "h-10 min-w-14 rounded-lg border px-4 text-sm font-black transition-all",
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
            {isLowStock && selectedVariant && (
              <p className="mt-2 text-xs font-bold text-amber-600">Only {selectedStock} left for this option.</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <p className="mb-2 text-sm font-black">Quantity</p>
            <div className="flex w-fit items-center overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={isSoldOut || quantity <= 1}
                className="h-10 w-11 text-lg font-bold transition-colors hover:bg-muted disabled:opacity-40"
              >
                -
              </button>
              <span className="flex h-10 w-12 items-center justify-center border-x border-border text-sm font-black tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(quantity + 1, selectedStock))}
                disabled={isSoldOut || quantity >= selectedStock}
                className="h-10 w-11 text-lg font-bold transition-colors hover:bg-muted disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions — desktop */}
          <div className="hidden space-y-3 pt-1 md:block">
            <Button size="lg" className="h-12 w-full rounded-xl text-sm font-black" onClick={handleBuyNow} disabled={isSoldOut}>
              {isSoldOut ? "Sold Out" : "Buy this Item"}
            </Button>
            <Button size="lg" variant="outline" className="h-12 w-full rounded-xl border-primary text-sm font-black" onClick={handleAddToCart} disabled={isSoldOut}>
              {isSoldOut ? (
                "Sold Out"
              ) : addedToCart ? (
                <><Check className="mr-2 h-4 w-4" /> Added!</>
              ) : (
                <><ShoppingBag className="mr-2 h-4 w-4" /> Add to Bag</>
              )}
            </Button>
          </div>

          {/* Chat / Wishlist / Share */}
          <div className="grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground">
            <button className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 transition-colors hover:bg-muted hover:text-foreground">
              <MessageCircle className="h-4 w-4" /> Chat
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 transition-colors hover:bg-muted hover:text-foreground">
              <Heart className="h-4 w-4" /> Wishlist
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
              className="flex items-center justify-center gap-2 rounded-lg border border-border py-3 transition-colors hover:bg-muted hover:text-foreground"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </aside>
      </section>

      {/* Trust elements */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: ShieldCheck, label: "Secure Checkout", desc: "OTP verified orders" },
          { icon: Truck, label: "Fast Delivery", desc: "Inside Chattogram" },
          { icon: PackageCheck, label: "Easy Return", desc: "Hassle-free exchanges" },
          { icon: ShoppingBag, label: "COD Available", desc: "Pay on delivery" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background p-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Description */}
      <section id="description" className="mt-5 rounded-[1.5rem] border border-border/70 bg-background p-4 shadow-sm md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {[
              ["Description", "#description"],
              ["Styling Ideas", "#styling-ideas"],
              ["Customer Reviews", "#reviews"],
              ["Related Products", "#related-products"],
            ].map(([tab, href], index) => (
              <a
                key={tab}
                href={href}
                className={cn(
                  "shrink-0 rounded-lg border px-5 py-2 text-xs font-black transition-all",
                  index === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"
                )}
              >
                {tab}
              </a>
            ))}
          </div>
        </div>

        <div className="max-w-5xl">
          <h2 className="text-xl font-black">Product Details</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description ?? "A Doshok essential selected for clean styling, comfortable wear, and everyday versatility."}
          </p>
          <div className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <DetailRow label="Category" value={product.category.name} />
            <DetailRow label="Stock Available" value={`${totalStock} pcs`} />
            <DetailRow label="Specification" value="Quality checked, comfortable fit, easy care" />
            <DetailRow label="Department" value="Women" />
          </div>
        </div>
      </section>

      {/* Styling Ideas */}
      <section id="styling-ideas" className="mt-5 grid overflow-hidden rounded-[1.5rem] border border-border/70 bg-background shadow-sm lg:grid-cols-[1fr_220px]">
        <div className="p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">Styling Ideas</h2>
            <Link href="/products" className="text-xs font-black text-muted-foreground hover:text-foreground transition-colors">See more</Link>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {bundleProducts.map((item, index) => (
              <div key={item.slug} className="flex items-center gap-3">
                <Link href={`/products/${item.slug}`} className="w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md">
                  <div className="aspect-square bg-muted">
                    {item.images[0] ? (
                      <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <ProductImagePlaceholder small />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 min-h-[2rem] text-xs font-bold">{item.name}</p>
                    <p className="mt-1 text-xs font-black">৳{item.price.toLocaleString()}</p>
                  </div>
                </Link>
                {index < bundleProducts.length - 1 && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">
                    +
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center border-t border-border bg-muted/40 p-6 lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold text-muted-foreground">Total</p>
          <p className="mt-2 text-2xl font-black">৳{bundleTotal.toLocaleString()}</p>
          {bundleOldTotal > bundleTotal && (
            <p className="mt-1 text-sm font-black text-emerald-600">Save ৳{(bundleOldTotal - bundleTotal).toLocaleString()}</p>
          )}
          <Button className="mt-4 rounded-xl" onClick={handleAddToCart} disabled={isSoldOut}>
            Add to Bag
          </Button>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="mt-8">
        <h2 className="mb-4 text-xl font-black">Customer Reviews</h2>
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-foreground">Reviews are not available yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Real customer reviews will appear here once a review system is connected to completed orders.
          </p>
        </div>
      </section>

      {/* Related Products */}
      <section id="related-products" className="mt-10 pb-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">Best Seller</h2>
        </div>
        {relatedProducts.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-background p-10 text-center text-muted-foreground">
            More best sellers will appear when additional products are added.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {relatedProducts.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Sticky mobile purchase bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{product.name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black">৳{product.price.toLocaleString()}</span>
              {product.oldPrice && (
                <span className="text-xs text-red-400 line-through">৳{product.oldPrice.toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-xl px-4 text-xs font-black"
              onClick={handleAddToCart}
              disabled={isSoldOut}
            >
              {addedToCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              className="h-11 rounded-xl px-5 text-xs font-black"
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

function ProductImagePlaceholder({ small = false }: { small?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
      <PackageCheck className={small ? "h-5 w-5" : "h-10 w-10"} />
      {!small && <span className="text-sm font-medium">Image coming soon</span>}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}
