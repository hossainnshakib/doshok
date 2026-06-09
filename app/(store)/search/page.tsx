import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/store/product-card"
import { Search, Package, TrendingUp, Tag, Sparkles } from "lucide-react"

const SUGGESTED_SEARCHES = ["T-Shirt", "Shirt", "Panjabi", "Saree", "Kurta", "Shoe"]

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  const products = q
    ? await prisma.product.findMany({
        where: {
          status: "Active",
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: { variants: true, category: true },
        orderBy: { createdAt: "desc" },
      })
    : []

  const categories = await prisma.category.findMany({
    take: 6,
    orderBy: { name: "asc" },
  })

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-1">
          {q ? `"${q}"` : "Search Products"}
        </h1>
        {q && (
          <p className="text-muted-foreground text-sm mt-2">
            {products.length} product{products.length !== 1 ? "s" : ""} found
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
      ) : products.length === 0 ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}