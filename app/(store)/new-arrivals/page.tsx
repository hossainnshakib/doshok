import Link from "next/link"
import type { Metadata } from "next"
import { ProductCard } from "@/components/store/product-card"
import { prisma } from "@/lib/prisma"
import { ArrowRight, Package } from "lucide-react"

export const metadata: Metadata = {
  title: "New Arrivals – Doshok",
  description: "Fresh drops and the latest arrivals from Doshok. Discover new fashion pieces, curated weekly for the modern wardrobe.",
}

export default async function NewArrivalsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "Active" },
      include: { variants: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      take: 6,
    }),
  ])

  return (
    <main className="bg-[#f7f5f1]">
      <section className="container mx-auto container-px pt-8 md:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#15191c] text-white shadow-2xl shadow-black/10">
          <div className="grid gap-8 p-7 md:grid-cols-[1fr_0.85fr] md:p-12 lg:p-16">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                New Arrivals
              </p>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
                Fresh pieces for everyday elegance.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Explore the newest Doshok drops across fashion essentials, modest layers, accessories, and polished seasonal edits.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#15191c] transition hover:bg-white/90"
                >
                  View All Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/size-guide"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Size Guide
                </Link>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="rounded-2xl bg-white/10 p-4 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#15191c]">
                      {category.name.slice(0, 1)}
                    </span>
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px py-8 md:py-12">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">Latest Drop</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">Just Added</h2>
          </div>
          <p className="text-sm text-neutral-500">{products.length} new product{products.length === 1 ? "" : "s"}</p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-[1.75rem] border border-black/5 bg-white px-6 py-20 text-center shadow-sm">
            <Package className="mx-auto mb-4 h-10 w-10 text-neutral-400" />
            <h3 className="text-lg font-black">No new arrivals yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
              New Doshok products will appear here as soon as they are active.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}