import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/store/product-card"
import { ProductPagination } from "@/components/store/product-pagination"
import { trackEvent } from "@/lib/trakon"
import { auth } from "@/lib/auth"
import { Search, Package, TrendingUp, Tag, Sparkles } from "lucide-react"

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

const SUGGESTED_SEARCHES = ["T-Shirt", "Shirt", "Panjabi", "Saree", "Kurta", "Shoe"]
const LIMIT = 24
const MAX_RESULTS = 200

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const resolved = await searchParams
  const { q } = resolved
  const currentPage = Math.max(1, parseInt(resolved.page ?? "1", 10) || 1)

  let rankedProducts: Array<{
    id: string
    name: string
    slug: string
    price: number
    oldPrice: number | null
    images: string[]
    description: string | null
    shortDescription: string | null
    seoKeywords: string | null
    averageRating: number | null
    reviewCount: number | null
    variants: { stock: number; reservedStock: number; sku: string | null }[]
    category: { name: string; slug: string }
  }> = []
  let total = 0

  if (q) {
    const session = await auth()
    void trackEvent("Search", {
      search_string: q,
      email: session?.user?.email,
      phone: session?.user?.phone,
    })

    const products = await prisma.product.findMany({
      where: {
        status: "Active",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { shortDescription: { contains: q, mode: "insensitive" } },
          { seoKeywords: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { variants: true, category: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS,
    })

    rankedProducts = products.sort((a, b) => {
      const qLower = q.toLowerCase()
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aHasName = aName.includes(qLower)
      const bHasName = bName.includes(qLower)
      if (aHasName && !bHasName) return -1
      if (bHasName && !aHasName) return 1
      if (aHasName && bHasName) {
        const aExact = aName === qLower
        const bExact = bName === qLower
        if (aExact && !bExact) return -1
        if (bExact && !aExact) return 1
        const aStarts = aName.startsWith(qLower)
        const bStarts = bName.startsWith(qLower)
        if (aStarts && !bStarts) return -1
        if (bStarts && !aStarts) return 1
      }
      const aHasSku = a.variants.some((v) => v.sku?.toLowerCase().includes(qLower))
      const bHasSku = b.variants.some((v) => v.sku?.toLowerCase().includes(qLower))
      if (aHasSku && !bHasSku) return -1
      if (bHasSku && !aHasSku) return 1
      const aHasCat = a.category.name.toLowerCase().includes(qLower)
      const bHasCat = b.category.name.toLowerCase().includes(qLower)
      if (aHasCat && !bHasCat) return -1
      if (bHasCat && !aHasCat) return 1
      const aHasShortDesc = (a.shortDescription ?? "").toLowerCase().includes(qLower)
      const bHasShortDesc = (b.shortDescription ?? "").toLowerCase().includes(qLower)
      if (aHasShortDesc && !bHasShortDesc) return 1
      if (bHasShortDesc && !aHasShortDesc) return -1
      const aHasSeoKw = (a.seoKeywords ?? "").toLowerCase().includes(qLower)
      const bHasSeoKw = (b.seoKeywords ?? "").toLowerCase().includes(qLower)
      if (aHasSeoKw && !bHasSeoKw) return 1
      if (bHasSeoKw && !aHasSeoKw) return -1
      const aHasDesc = (a.description ?? "").toLowerCase().includes(qLower)
      const bHasDesc = (b.description ?? "").toLowerCase().includes(qLower)
      if (aHasDesc && !bHasDesc) return 1
      if (bHasDesc && !aHasDesc) return -1
      return 0
    })

    total = rankedProducts.length
    const start = (currentPage - 1) * LIMIT
    rankedProducts = rankedProducts.slice(start, start + LIMIT)
  }

  const categories = await prisma.category.findMany({
    take: 6,
    orderBy: { name: "asc" },
  })

  const totalPages = Math.ceil(total / LIMIT)

  const searchParamsRecord: Record<string, string | undefined> = {
    q: q || undefined,
    page: resolved.page || undefined,
  }

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-1">
          {q ? `"${q}"` : "Search Products"}
        </h1>
        {q && (
          <p className="text-muted-foreground text-sm mt-2">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {!q ? (
        <div className="grid gap-6">
          <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-3xl">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">Enter a search term to find what you&apos;re looking for.</p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
              <TrendingUp className="h-4 w-4" /> Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SEARCHES.map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="inline-flex h-9 items-center rounded-full border border-input bg-background px-5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Tag className="h-4 w-4" /> Browse Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="inline-flex h-9 items-center rounded-full bg-muted px-5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : rankedProducts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold mb-2">No results found</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-6">
            We couldn&apos;t find any products matching &quot;{q}&quot;. Try a different term or browse our categories.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Browse All Products
            </Link>
            <Link
              href="/products?discount=true"
              className="inline-flex h-11 items-center justify-center rounded-full border border-input bg-background px-8 text-sm font-medium text-foreground hover:bg-accent transition-all"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" /> Special Discounts
            </Link>
          </div>
          <div className="mt-10">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Try these instead</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_SEARCHES.map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="inline-flex h-8 items-center rounded-full border border-input bg-background px-4 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {rankedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <ProductPagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/search"
            searchParams={searchParamsRecord}
          />
        </>
      )}
    </div>
  )
}
