"use client"

import { useState, useCallback } from "react"
import {
  Check,
  ChevronDown,
  Truck,
  CreditCard,
  PackageCheck,
} from "lucide-react"
import {
  PRODUCTS,
  REVIEW,
  FAQ_ITEMS,
  DELIVERY_FEE,
  getRegularTotal,
  getSetPrice,
  getSavings,
  type Product,
} from "./data"

/* ─── Image placeholders (gradient-based) ─── */
function ProductImg({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(145deg, ${product.gradientFrom}, ${product.gradientTo})` }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 p-4 text-center">
        <svg viewBox="0 0 24 36" className="w-10 h-14 md:w-12 md:h-16 text-white/40 mb-2" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M8 2C5.5 2 4 4 4 6C4 8 5 9 6 10L4 34H20L18 10C19 9 20 8 20 6C20 4 18.5 2 16 2H8Z" />
          <path d="M8 2C8 2 10 4 12 4C14 4 16 2 16 2" />
        </svg>
        <span className="text-[10px] md:text-xs tracking-wider uppercase opacity-70">{product.name}</span>
      </div>
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.5) 0%, transparent 60%)"
      }} />
    </div>
  )
}

/* ─── Header ─── */
function Header({ onOrder }: { onOrder: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200/60">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <span className="text-lg md:text-xl font-bold tracking-[0.15em] text-stone-900" style={{ fontFamily: "var(--font-display)" }}>
          DOSHOK
        </span>
        <button onClick={onOrder} className="bg-stone-900 text-white text-xs font-semibold px-4 py-2 md:px-5 md:py-2.5 tracking-wide uppercase hover:bg-stone-800 transition-colors">
          Order Now
        </button>
      </div>
    </header>
  )
}

/* ─── Hero + Product Details ─── */
function Hero({ onSelect }: { onSelect: () => void }) {
  const p = PRODUCTS[0]
  const [activeImg, setActiveImg] = useState(0)
  const images = [0, 1, 2]

  return (
    <section className="bg-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
          {/* Left: Images */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <ProductImg product={p} className="w-full aspect-[3/4] md:aspect-[4/5] max-h-[480px] md:max-h-[560px]" />
              {p.oldPrice && (
                <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 tracking-wide">
                  SAVE ৳{p.oldPrice - p.price}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {images.map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`flex-1 aspect-square overflow-hidden transition-all ${
                    activeImg === i ? "ring-2 ring-stone-900" : "ring-1 ring-stone-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <ProductImg product={p} className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Info */}
          <div className="lg:sticky lg:top-20 lg:pt-4">
            <p className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
              The Amethyst Collection
            </p>
            <h1
              className="text-3xl md:text-4xl lg:text-[2.6rem] font-bold text-stone-900 leading-[1.1] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Amethyst Aura
            </h1>
            <p className="text-stone-500 text-sm leading-relaxed mb-4 max-w-md">
              {p.tagline}
            </p>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl md:text-3xl font-bold text-stone-900" style={{ fontFamily: "var(--font-display)" }}>
                ৳{p.price}
              </span>
              {p.oldPrice && (
                <span className="text-sm text-stone-400 line-through">৳{p.oldPrice}</span>
              )}
            </div>

            <p className="text-xs text-stone-500 mb-3">Free Size · Fits S–XL</p>

            <ul className="space-y-1.5 mb-5">
              {p.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-[13px] text-stone-600">
                  <Check className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" strokeWidth={2} />
                  {d}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 text-xs text-stone-400 mb-5">
              <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Cash on Delivery</span>
              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> 3–5 day delivery</span>
            </div>

            <button
              onClick={onSelect}
              className="w-full md:w-auto bg-stone-900 text-white text-sm font-semibold px-8 py-3.5 tracking-wider uppercase hover:bg-stone-800 transition-colors"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Product Selection + Pricing ─── */
function ProductSelection({
  selectedIds,
  onToggle,
  onContinue,
}: {
  selectedIds: string[]
  onToggle: (id: string) => void
  onContinue: () => void
}) {
  const [msg, setMsg] = useState("")
  const count = selectedIds.length
  const regular = getRegularTotal(selectedIds)
  const setPrice = getSetPrice(selectedIds)
  const savings = getSavings(selectedIds)
  const hasOffer = count >= 2

  const handleToggle = useCallback(
    (id: string) => {
      if (selectedIds.includes(id) && selectedIds.length === 1) {
        setMsg("Choose at least one item to continue.")
        setTimeout(() => setMsg(""), 2500)
        return
      }
      onToggle(id)
    },
    [selectedIds, onToggle]
  )

  return (
    <section id="product-selection" className="bg-stone-50 border-y border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Add More & Save
        </h2>
        <p className="text-sm text-stone-500 mb-5">Select your favourites — better set pricing applies automatically.</p>

        {/* Product rows */}
        <div className="space-y-2 mb-5">
          {PRODUCTS.map((product) => {
            const added = selectedIds.includes(product.id)
            return (
              <button
                key={product.id}
                onClick={() => handleToggle(product.id)}
                className={`w-full flex items-center gap-3 md:gap-4 py-3 px-3 text-left transition-all rounded-sm ${
                  added
                    ? "bg-white border border-stone-900/10"
                    : "bg-white border border-stone-200 hover:border-stone-400"
                }`}
              >
                <ProductImg product={product} className="w-14 h-[4.5rem] md:w-[4.5rem] md:h-[5.5rem] shrink-0 rounded-sm overflow-hidden" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-[15px] font-semibold text-stone-900" style={{ fontFamily: "var(--font-display)" }}>
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">Free Size</p>
                  <p className="text-sm font-semibold text-stone-800 mt-0.5">৳{product.price}</p>
                </div>
                <div className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-sm transition-all ${
                  added
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}>
                  {added ? <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Added</> : "+ Add"}
                </div>
              </button>
            )
          })}
        </div>

        {msg && <p className="text-sm text-stone-500 mb-3 animate-in fade-in">{msg}</p>}

        {/* Integrated pricing */}
        <div className="bg-white border border-stone-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-stone-700">{count} {count === 1 ? "item" : "items"} selected</span>
            {hasOffer && (
              <span className="text-[11px] font-semibold tracking-wide text-purple-700">
                {count === 2 ? "2-piece set price applied" : "Best value unlocked"}
              </span>
            )}
            {!hasOffer && count === 1 && (
              <span className="text-[11px] text-stone-400">Add another to unlock set pricing</span>
            )}
          </div>

          {hasOffer ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Regular</span>
                <span className="text-stone-400 line-through">৳{regular}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600 font-medium">Set saving</span>
                <span className="text-purple-600 font-medium">-৳{savings}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-100">
                <span className="text-stone-900">Your Total</span>
                <span className="text-stone-900" style={{ fontFamily: "var(--font-display)" }}>৳{setPrice}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between font-bold text-base">
              <span className="text-stone-900">Your Total</span>
              <span className="text-stone-900" style={{ fontFamily: "var(--font-display)" }}>৳{regular}</span>
            </div>
          )}

          <button
            onClick={onContinue}
            className="w-full mt-4 bg-stone-900 text-white text-sm font-semibold py-3.5 tracking-wider uppercase hover:bg-stone-800 transition-colors"
          >
            Continue to Order
          </button>
        </div>
      </div>
    </section>
  )
}

/* ─── Compact Trust + Social Proof ─── */
function TrustBlock() {
  return (
    <section className="bg-white border-b border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
          {/* Rating */}
          <div className="flex items-center gap-2.5">
            <span className="text-xl md:text-2xl font-bold text-stone-900" style={{ fontFamily: "var(--font-display)" }}>4.9</span>
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">120+ happy customers</p>
            </div>
          </div>

          {/* Trust points */}
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-stone-400" /> COD</span>
            <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-stone-400" /> Nationwide</span>
            <span className="flex items-center gap-1"><PackageCheck className="w-3.5 h-3.5 text-stone-400" /> Quality Checked</span>
          </div>
        </div>

        {/* Single review quote */}
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="text-[13px] text-stone-600 italic leading-relaxed">&ldquo;{REVIEW.text}&rdquo;</p>
          <p className="text-[11px] text-stone-400 mt-1">— {REVIEW.name}, verified buyer</p>
        </div>
      </div>
    </section>
  )
}

/* ─── Checkout ─── */
function Checkout({ selectedIds }: { selectedIds: string[] }) {
  const count = selectedIds.length
  const regular = getRegularTotal(selectedIds)
  const setPrice = getSetPrice(selectedIds)
  const savings = getSavings(selectedIds)
  const hasOffer = count >= 2
  const finalTotal = (hasOffer ? setPrice : regular) + DELIVERY_FEE
  const selected = selectedIds.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as Product[]

  return (
    <section className="bg-stone-50">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <h2 className="text-lg md:text-xl font-bold text-stone-900 mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
          Complete Your Order
        </h2>
        <p className="text-sm text-stone-500 mb-5 md:mb-7">Almost yours. Add your delivery details below.</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-7 lg:gap-10">
          {/* Form */}
          <div className="lg:col-span-3 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Name *</label>
                <input type="text" placeholder="Your full name" className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Mobile Number *</label>
                <input type="tel" placeholder="01XXXXXXXXX" className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Email (optional)</label>
              <input type="email" placeholder="you@example.com" className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Division *</label>
                <select className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 appearance-none transition-colors">
                  <option value="">Select</option>
                  <option>Dhaka</option><option>Chattogram</option><option>Rajshahi</option>
                  <option>Khulna</option><option>Barishal</option><option>Sylhet</option>
                  <option>Rangpur</option><option>Mymensingh</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">District *</label>
                <input type="text" placeholder="e.g. Dhaka" className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Thana / Upazila *</label>
                <input type="text" placeholder="e.g. Gulshan" className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Area / Locality</label>
                <input type="text" placeholder="e.g. Sector 5" className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Full Address *</label>
              <textarea rows={2} placeholder="House/flat, road, area details..." className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 resize-none transition-colors" />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 mb-1 tracking-wide uppercase">Note (optional)</label>
              <input type="text" placeholder="Any special instructions..." className="w-full px-3 py-2.5 bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500/20 transition-colors" />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-20 bg-white border border-stone-200 p-4 md:p-5">
              <h3 className="text-[15px] font-bold text-stone-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>Your Order</h3>

              <div className="space-y-2.5 mb-3">
                {selected.map((product) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className="w-10 h-12 shrink-0 flex items-center justify-center rounded-sm overflow-hidden" style={{ background: `linear-gradient(145deg, ${product.gradientFrom}, ${product.gradientTo})` }}>
                      <span className="text-white/50 text-[8px] tracking-wider uppercase">{product.name.split(" ")[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-stone-800 truncate">{product.name}</p>
                      <p className="text-[10px] text-stone-400">Free Size</p>
                    </div>
                    <p className="text-[13px] font-medium text-stone-800">৳{product.price}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-3 space-y-1.5 text-[13px]">
                {hasOffer && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-stone-400 line-through">Regular</span>
                      <span className="text-stone-400 line-through">৳{regular}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-600 font-medium">Set saving</span>
                      <span className="text-purple-600 font-medium">-৳{savings}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Delivery</span>
                  <span className="text-stone-700">৳{DELIVERY_FEE}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-200">
                  <span className="text-stone-900">Total</span>
                  <span className="text-stone-900" style={{ fontFamily: "var(--font-display)" }}>৳{finalTotal}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-2.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cash on Delivery · Pay when it arrives</span>
              </div>

              <button className="w-full mt-3 bg-stone-900 text-white text-sm font-semibold py-3.5 tracking-wider uppercase hover:bg-stone-800 transition-colors">
                Place Order — ৳{finalTotal}
              </button>

              <p className="text-[10px] text-stone-400 text-center mt-2.5">
                By placing this order you agree to our terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ (compact) ─── */
function FaqCompact() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="bg-white border-t border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-5 md:py-6">
        <h3 className="text-[15px] font-bold text-stone-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>Common Questions</h3>
        <div className="space-y-px bg-stone-200">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-white">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[44px]">
                <span className="text-[13px] font-medium text-stone-800 pr-3">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-4 pb-3">
                  <p className="text-[13px] text-stone-500 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="bg-stone-950 text-white py-6">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 text-center">
        <span className="text-sm tracking-[0.2em] font-bold" style={{ fontFamily: "var(--font-display)" }}>DOSHOK</span>
        <p className="text-[11px] text-stone-500 mt-1.5">&copy; {new Date().getFullYear()} doshok.com · All rights reserved</p>
      </div>
    </footer>
  )
}

/* ─── Main View ─── */
export function LandingV1View() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["amethyst-aura"])

  const toggleProduct = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }, [])

  const scrollToCheckout = useCallback(() => {
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const scrollToSelection = useCallback(() => {
    document.getElementById("product-selection")?.scrollIntoView({ behavior: "smooth" })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header onOrder={scrollToCheckout} />
      <Hero onSelect={scrollToSelection} />
      <ProductSelection selectedIds={selectedIds} onToggle={toggleProduct} onContinue={scrollToCheckout} />
      <TrustBlock />
      <div id="checkout">
        <Checkout selectedIds={selectedIds} />
      </div>
      <FaqCompact />
      <Footer />
    </div>
  )
}
