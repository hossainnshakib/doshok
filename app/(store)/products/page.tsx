import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/store/product-card"
import { Package } from "lucide-react"

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; discount?: string; featured?: string }>
}) {
  const { category, discount, featured } = await searchParams
  const selectedCategory = category
    ? await prisma.category.findUnique({ where: { slug: category } })
    : null

  const showDiscounts = discount === "true"
  const showFeatured = featured === "true"

  const products = await prisma.product.findMany({
    where: {
      status: "Active",
      ...(category ? { categoryId: selectedCategory?.id ?? "__missing_category__" } : {}),
      ...(showDiscounts ? { oldPrice: { not: null } } : {}),
      ...(showFeatured ? { featured: true } : {}),
    },
    include: { variants: true, category: true },
    orderBy: { createdAt: "desc" },
  })

  const allCategories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Collection</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight capitalize">
            {selectedCategory?.name ?? (showDiscounts ? "Special Discount" : showFeatured ? "Doshok Picks" : "All Products")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-10 flex-wrap">
        <Link
          href="/products"
          className={`inline-flex h-9 items-center rounded-full px-5 text-xs font-medium tracking-wide transition-all ${
            !category
              && !showDiscounts
              && !showFeatured
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          All
        </Link>
        <Link
          href="/products?discount=true"
          className={`inline-flex h-9 items-center rounded-full px-5 text-xs font-medium tracking-wide transition-all ${
            showDiscounts
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          Special Discount
        </Link>
        <Link
          href="/products?featured=true"
          className={`inline-flex h-9 items-center rounded-full px-5 text-xs font-medium tracking-wide transition-all ${
            showFeatured
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          Doshok Picks
        </Link>
        {allCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className={`inline-flex h-9 items-center rounded-full px-5 text-xs font-medium tracking-wide transition-all ${
              category === cat.slug
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm">
            {category
              ? "No products in this category yet."
              : showDiscounts
                ? "No discounted products are active right now."
                : showFeatured
                  ? "No featured products are active right now."
              : "Check back soon for new arrivals."}
          </p>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View All Products
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