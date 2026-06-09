import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/store/product-card"
import { Search, Package } from "lucide-react"

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

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-1">
          {q ? `Results for "${q}"` : "Search Products"}
        </h1>
        {q && (
          <p className="text-muted-foreground text-sm mt-2">
            {products.length} product{products.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {!q ? (
        <div className="text-center py-24 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-lg">Enter a search term to find products.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No results found</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm">
            We couldn&apos;t find any products matching &quot;{q}&quot;. Try a different search term.
          </p>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Browse All Products
          </Link>
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