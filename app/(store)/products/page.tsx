import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { getSiteSettings } from "@/lib/site-settings"
import { ProductCard } from "@/components/store/product-card"
import { ProductSortSelect } from "@/components/store/product-sort-select"
import { ProductPagination } from "@/components/store/product-pagination"
import { Package } from "lucide-react"
import { safeJsonLd } from "@/lib/json-ld"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

const LIMIT = 24

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const categorySlug = params.category
  const settings = await getSiteSettings()

  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } })
    if (cat) {
      const title = cat.seoTitle || `${cat.name} | Doshok`
      const description = cat.seoDescription || `Browse ${cat.name} collection from Doshok`
      return {
        title,
        description,
        keywords: cat.seoKeywords || undefined,
        openGraph: {
          title,
          description,
          images: cat.seoImage ? [{ url: cat.seoImage }] : undefined,
          siteName: settings?.defaultSeoTitle || "Doshok",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: cat.seoImage ? [cat.seoImage] : undefined,
        },
        alternates: { canonical: `${SITE_URL}/products?category=${categorySlug}` },
      }
    }
  }

  const title = settings?.defaultSeoTitle ? `${settings.defaultSeoTitle}` : "Products | Doshok"
  const description = settings?.defaultSeoDescription || "Browse all products from Doshok"

  return {
    title,
    description,
    keywords: settings?.defaultSeoKeywords || undefined,
    openGraph: {
      title,
      description,
      images: settings?.defaultSeoImage ? [{ url: settings.defaultSeoImage }] : undefined,
      siteName: settings?.defaultSeoTitle || "Doshok",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings?.defaultSeoImage ? [settings.defaultSeoImage] : undefined,
    },
    alternates: { canonical: `${SITE_URL}/products` },
  }
}

type SortOption = "newest" | "price-low" | "price-high" | "rating"

const SORT_MAP: Record<SortOption, Record<string, "asc" | "desc">> = {
  newest: { createdAt: "desc" },
  "price-low": { price: "asc" },
  "price-high": { price: "desc" },
  rating: { averageRating: "desc" },
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; discount?: string; featured?: string; page?: string; sort?: string }>
}) {
  const params = await searchParams
  const { category, discount, featured } = params
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const sortParam = (params.sort as SortOption) || "newest"
  const orderBy = SORT_MAP[sortParam] || SORT_MAP.newest

  const selectedCategory = category
    ? await prisma.category.findUnique({ where: { slug: category } })
    : null

  if (category && !selectedCategory) {
    return (
      <div className="container mx-auto container-px py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Collection</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight capitalize">Category Not Found</h1>
          </div>
        </div>
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Category not found</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm">
            The category you are looking for does not exist.
          </p>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    )
  }

  const showDiscounts = discount === "true"
  const showFeatured = featured === "true"
  const hasActiveFilter = !!(category || showDiscounts || showFeatured)

  const where: Record<string, unknown> = { status: "Active" }
  if (category && selectedCategory?.id) where.categoryId = selectedCategory.id
  if (showDiscounts) where.oldPrice = { not: null }
  if (showFeatured) where.featured = true

  const [products, total, allCategories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true, category: true },
      orderBy,
      skip: (currentPage - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  const totalPages = Math.ceil(total / LIMIT)

  const searchParamsRecord: Record<string, string | undefined> = {
    category: category || undefined,
    discount: discount || undefined,
    featured: featured || undefined,
    sort: sortParam === "newest" ? undefined : sortParam,
    page: params.page || undefined,
  }

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      ...(selectedCategory
        ? [
            { "@type": "ListItem", "position": 2, "name": "Products", "item": `${SITE_URL}/products` },
            { "@type": "ListItem", "position": 3, "name": selectedCategory.name, "item": `${SITE_URL}/products?category=${selectedCategory.slug}` },
          ]
        : [
            { "@type": "ListItem", "position": 2, "name": "Products", "item": `${SITE_URL}/products` },
          ]),
    ],
  }

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbList),
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Collection</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight capitalize">
            {selectedCategory?.name ?? (showDiscounts ? "Special Discount" : showFeatured ? "Doshok Picks" : "All Products")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total} product{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProductSortSelect currentSort={sortParam} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-10 flex-wrap">
        <Link
          href="/products"
          className={`inline-flex h-9 items-center rounded-full px-5 text-xs font-medium tracking-wide transition-all ${
            !hasActiveFilter
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
        {hasActiveFilter && (
          <Link
            href="/products"
            className="inline-flex h-9 items-center rounded-full px-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            ✕ Clear
          </Link>
        )}
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <ProductPagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/products"
            searchParams={searchParamsRecord}
          />
        </>
      )}
    </div>
  )
}
