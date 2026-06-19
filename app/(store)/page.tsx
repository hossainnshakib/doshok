import { Fragment } from "react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/store/product-card"
import { Briefcase, Grid3X3, ImageIcon, PackageCheck, Shirt, ShoppingBag, Watch } from "lucide-react"
import { parseSections, getEnabledSections } from "@/lib/homepage-sections"
import type { HomepageSection } from "@/lib/homepage-sections"
import styles from "./page.module.css"

type HomeProduct = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  variants: { stock: number; reservedStock: number }[]
  category?: { name: string; slug: string }
}

type HomeCategory = {
  id: string
  name: string
  slug: string
  image: string | null
}

function mapProduct(p: {
  id: string; name: string; slug: string; price: number; oldPrice: number | null;
  images: string[]; variants: { stock: number; reservedStock: number }[];
  category?: { name: string; slug: string } | null;
}): HomeProduct {
  return { ...p, category: p.category ?? undefined }
}

async function getHomepageData() {
  const homepageConfig = await prisma.homepageConfig.findUnique({
    where: { id: "homepage" },
  })

  const sections = parseSections(homepageConfig?.sections)
  const enabledSections = getEnabledSections(sections)

  let featuredIds: string[] = []
  try {
    const parsed = JSON.parse(homepageConfig?.featuredIds ?? "[]")
    if (Array.isArray(parsed)) featuredIds = parsed
  } catch {}

  const heroTitle = homepageConfig?.heroTitle ?? "Fashion with\nPurpose."
  const heroSubtitle = homepageConfig?.heroSubtitle ?? "Thoughtful silhouettes, clean essentials, and occasion-ready pieces — made for your wardrobe."
  const heroCTAText = homepageConfig?.heroCTAText ?? "Shop Collection"
  const heroCTASecondaryText = homepageConfig?.heroCTASecondaryText ?? "About Us"

  const hasCatSection = enabledSections.some((s) => s.type === "categories")
  const hasNewSection = enabledSections.some((s) => s.type === "new_arrivals")
  const hasSaleSection = enabledSections.some((s) => s.type === "sale_products")
  const hasFeatSection = enabledSections.some((s) => s.type === "featured_products")
  const hasBestSection = enabledSections.some((s) => s.type === "best_sellers")

  const needsLatest = hasNewSection || hasFeatSection || hasBestSection || (!homepageConfig?.heroImage)

  const catSection = enabledSections.find((s) => s.type === "categories")
  const saleSection = enabledSections.find((s) => s.type === "sale_products")
  const newSection = enabledSections.find((s) => s.type === "new_arrivals")

  const maxCategories = (catSection?.config?.maxCategories as number) ?? 8
  const maxSaleProducts = (saleSection?.config?.maxProducts as number) ?? 4
  const maxNewProducts = (newSection?.config?.maxProducts as number) ?? 8

  const [categories, latestPrisma, salePrisma] = await Promise.all([
    hasCatSection
      ? prisma.category.findMany({
          where: { parentId: null },
          orderBy: { name: "asc" },
          take: maxCategories,
        })
      : Promise.resolve<HomeCategory[]>([]),
    needsLatest
      ? prisma.product.findMany({
          where: { status: "Active" },
          include: { variants: true, category: true },
          orderBy: { createdAt: "desc" },
          take: Math.max(maxNewProducts, (hasFeatSection || hasBestSection) ? 12 : 8),
        })
      : Promise.resolve<Parameters<typeof mapProduct>[0][]>([]),
    hasSaleSection
      ? prisma.product.findMany({
          where: { status: "Active", oldPrice: { not: null } },
          include: { variants: true, category: true },
          orderBy: { updatedAt: "desc" },
          take: maxSaleProducts,
        })
      : Promise.resolve<Parameters<typeof mapProduct>[0][]>([]),
  ])
  const latestProducts = latestPrisma.map(mapProduct)
  const saleProducts = salePrisma.map(mapProduct)

  let featuredProducts: HomeProduct[] = []
  if (featuredIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: featuredIds }, status: "Active" },
      include: { variants: true, category: true },
    })
    const orderMap = new Map(featuredIds.map((id, index) => [id, index]))
    featuredProducts = products.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)).map(mapProduct)
  }

  if (hasFeatSection) {
    const maxFeatProducts = (enabledSections.find((s) => s.type === "featured_products")?.config?.maxProducts as number) ?? 4
    if (featuredProducts.length < maxFeatProducts) {
      const need = maxFeatProducts - featuredProducts.length
      const featuredFallback = await prisma.product.findMany({
        where: { featured: true, status: "Active", id: { notIn: featuredProducts.map((p) => p.id) } },
        include: { variants: true, category: true },
        take: need,
      })
      featuredProducts = [...featuredProducts, ...featuredFallback.map(mapProduct)]
    }
    if (featuredProducts.length < maxFeatProducts) {
      const need = maxFeatProducts - featuredProducts.length
      const latestFallback = latestProducts
        .filter((p) => !featuredProducts.find((fp) => fp.id === p.id))
        .slice(0, need)
      featuredProducts = [...featuredProducts, ...latestFallback]
    }
  }

  let bestSellers: HomeProduct[] = []
  if (hasBestSection) {
    const maxBestProducts = (enabledSections.find((s) => s.type === "best_sellers")?.config?.maxProducts as number) ?? 8
    try {
      const orderProducts = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" as const } },
        take: maxBestProducts,
      })
      if (orderProducts.length > 0) {
        const productIds = orderProducts.map((op) => op.productId)
        const products = await prisma.product.findMany({
          where: { id: { in: productIds }, status: "Active" },
          include: { variants: true, category: true },
        })
        const orderMap = new Map(orderProducts.map((op, i) => [op.productId, i]))
        bestSellers = products.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)).map(mapProduct)
      }
    } catch {}
    if (bestSellers.length === 0) {
      bestSellers = (featuredProducts.length > 0 ? featuredProducts : latestProducts).slice(0, maxBestProducts)
    }
  }

  const allProducts = [...new Map([...latestProducts, ...featuredProducts, ...bestSellers].map((p) => [p.id, p])).values()]
  const heroProducts = allProducts.filter((product, index, list) => (
    product.images[0] && list.findIndex((item) => item.id === product.id) === index
  )).slice(0, 4)

  return {
    categories,
    latestProducts,
    saleProducts,
    featuredProducts,
    bestSellers,
    heroImage: homepageConfig?.heroImage ?? null,
    heroTitle,
    heroSubtitle,
    heroCTAText,
    heroCTASecondaryText,
    promoBannerText: homepageConfig?.promoBannerText ?? "",
    promoBannerImage: homepageConfig?.promoBannerImage ?? null,
    promoBannerLink: homepageConfig?.promoBannerLink ?? "",
    promoBannerEnabled: homepageConfig?.promoBannerEnabled ?? false,
    sections: enabledSections,
    heroProducts,
    hasProducts: latestProducts.length > 0,
  }
}

function CategoryCard({ category, index }: { category: HomeCategory; index: number }) {
  const icons = [Shirt, Shirt, Shirt, Briefcase, ShoppingBag, Shirt, Watch, ShoppingBag]
  const Icon = icons[index % icons.length]

  return (
    <Link href={`/products?category=${category.slug}`} className={styles.cat}>
      <div className={styles.catIcon}>
        {category.image ? <img src={category.image} alt={category.name} /> : <Icon size={26} />}
      </div>
      <div className={styles.catLabel}>{category.name}</div>
    </Link>
  )
}

function renderCategoriesSection(categories: HomeCategory[], section: HomepageSection) {
  if (categories.length === 0) return null
  return (
    <section className={styles.categories}>
      {categories.map((category, index) => (
        <CategoryCard key={category.id} category={category} index={index} />
      ))}
      <Link href="/products" className={styles.cat}>
        <div className={styles.catIcon}><Grid3X3 size={22} /></div>
        <div className={styles.catLabel}>All Category</div>
      </Link>
    </section>
  )
}

function renderSaleProductsSection(saleProducts: HomeProduct[], section: HomepageSection) {
  const products = saleProducts.slice(0, (section.config.maxProducts as number) ?? 4)
  if (products.length === 0) return null
  const title = section.title || "Special Discount"
  return (
    <section className={styles.section}>
      <div className={styles.sectionWrap}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>
            <span className={styles.bolt}><PackageCheck size={16} /></span>
            {title}
          </div>
          <Link href="/products?discount=true" className={styles.viewAll}>
            View All <span className="inline-block ml-1">→</span>
          </Link>
        </div>
        <div className={styles.row}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

function renderNewArrivalsSection(latestProducts: HomeProduct[], saleProducts: HomeProduct[], section: HomepageSection) {
  const max = (section.config.maxProducts as number) ?? 8
  const products = latestProducts.slice(0, max)
  if (products.length === 0) return null
  const title = section.title || "New Arrivals"
  const firstRow = products.slice(0, Math.min(4, products.length))
  const secondRow = products.slice(4, max)
  const hasSale = saleProducts.length > 0
  return (
    <section className={styles.section}>
      <div className={`${styles.sectionWrap} ${styles.sectionWhite}`}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>{title}</div>
          <div className={styles.tabs}>
            <Link href="/new-arrivals" className={`${styles.tab} ${styles.tabActive}`}>New Arrivals</Link>
            <Link href="/products?featured=true" className={styles.tab}>Featured</Link>
            {hasSale && (
              <Link href="/products?discount=true" className={styles.tab}>Discounted</Link>
            )}
          </div>
        </div>
        <div className={styles.row} style={{ marginBottom: 16 }}>
          {firstRow.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {secondRow.length > 0 && (
          <div className={styles.row}>
            {secondRow.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function renderFeaturedProductsSection(featuredProducts: HomeProduct[], section: HomepageSection) {
  const max = (section.config.maxProducts as number) ?? 4
  const products = featuredProducts.slice(0, max)
  if (products.length === 0) return null
  const title = section.title || "Doshok Picks"
  const description = section.description || "Curated sets for daily elegance and effortless style."
  const promoProduct = products.find((p) => p.images[0]) ?? products[0]
  return (
    <section className={styles.section}>
      <div className={`${styles.sectionWrap} ${styles.sectionWhite}`}>
        <div className={styles.bssHead}>{title}</div>
        <div className={styles.bss}>
          <div className={styles.bssPromo}>
            <div />
            <div className={styles.promoImage}>
              {promoProduct?.images[0] ? (
                <Link href={`/products/${promoProduct.slug}`}>
                  <img src={promoProduct.images[0]} alt={promoProduct.name} />
                </Link>
              ) : (
                <div className={styles.imageEmpty} />
              )}
            </div>
            <div>
              <div className={styles.pbTitle}>{title}</div>
              <div className={styles.pbSub}>{description}</div>
            </div>
          </div>
          <div className={styles.bssGrid}>
            {products.map((product, index) => (
              <Link key={product.id} href={`/products/${product.slug}`} className={styles.storeCard}>
                <div className={styles.storeHead}>
                  <div className={styles.storeLogo}>{index + 1}</div>
                  <div>
                    <div className={styles.storeName}>{product.name}</div>
                    <div className={styles.storeTag}>Featured</div>
                  </div>
                </div>
                <div className={styles.storeProds}>
                  <div className={styles.storeProd}>
                    <div className={styles.storeImg}>
                      {product.images[0] ? (
                        <img src={product.images[0]} alt={product.name} loading="lazy" />
                      ) : (
                        <div className={styles.imageEmpty}>
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                    <div className={styles.storePrice}>৳{product.price.toLocaleString()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function renderBestSellersSection(bestSellers: HomeProduct[], section: HomepageSection) {
  const max = (section.config.maxProducts as number) ?? 8
  const products = bestSellers.slice(0, max)
  if (products.length === 0) return null
  const title = section.title || "Best Sellers"
  const firstRow = products.slice(0, Math.min(4, products.length))
  const secondRow = products.slice(4, max)
  return (
    <section className={styles.section}>
      <div className={`${styles.sectionWrap} ${styles.sectionWhite}`}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>{title}</div>
        </div>
        <div className={styles.row} style={{ marginBottom: secondRow.length > 0 ? 16 : 0 }}>
          {firstRow.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {secondRow.length > 0 && (
          <div className={styles.row}>
            {secondRow.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function renderPromoBannerSection(promoBannerEnabled: boolean, promoBannerText: string, promoBannerImage: string | null, promoBannerLink: string, section: HomepageSection) {
  if (!promoBannerEnabled || !promoBannerText) return null
  return (
    <section className={styles.promoBanner}>
      {promoBannerImage && (
        <>
          <div className={styles.promoBannerImage} style={{ backgroundImage: `url(${promoBannerImage})` }} />
          <div className={styles.promoBannerOverlay} />
        </>
      )}
      <div className={styles.promoBannerContent}>
        <p className={styles.promoBannerText}>{promoBannerText}</p>
        {promoBannerLink && (
          <Link href={promoBannerLink} className={styles.promoBannerLink}>
            Shop Now
          </Link>
        )}
      </div>
    </section>
  )
}

function renderQuoteSection(tagline: string, section: HomepageSection) {
  const text = section.title || tagline || "Style That Speaks"
  return (
    <section className={styles.quote}>
      <div className={styles.hangers} />
      <h2>&quot;{text}&quot;</h2>
    </section>
  )
}

function renderHeroSection(
  heroImage: string | null,
  heroTitle: string,
  heroSubtitle: string,
  heroCTAText: string,
  heroCTASecondaryText: string,
  heroProducts: HomeProduct[],
) {
  return (
    <>
      {heroImage && (
        <section className={styles.heroWithImage} style={{ backgroundImage: `url(${heroImage})` }}>
          <div className={styles.heroOverlay} />
          <div className={styles.heroLeft}>
            <div className={styles.heroTag}>
              <span className={styles.hash}>D</span>Style That Speaks
            </div>
            <h1 className={styles.heroTitle}>
              {heroTitle.split("\n").map((line, i) => (
                <span key={i}>{i === 1 ? <em>{line}</em> : line}<br /></span>
              ))}
            </h1>
            <p className={styles.sub}>{heroSubtitle}</p>
            <div className={styles.ctaRow}>
              <Link href="/products" className={styles.btnPrimary}>
                {heroCTAText}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/about" className={styles.btnGhost}>{heroCTASecondaryText}</Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.hero} style={heroImage ? { display: "none" } : {}}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>
            <span className={styles.hash}>D</span>Style That Speaks
          </div>
          <h1 className={styles.heroTitle}>
            {heroTitle.split("\n").map((line, i) => (
              <span key={i}>{i === 1 ? <em>{line}</em> : line}<br /></span>
            ))}
          </h1>
          <p className={styles.sub}>{heroSubtitle}</p>
          <div className={styles.ctaRow}>
            <Link href="/products" className={styles.btnPrimary}>
              {heroCTAText}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link href="/about" className={styles.btnGhost}>{heroCTASecondaryText}</Link>
          </div>
        </div>
        <div className={styles.heroRight}>
          {heroProducts.length > 0 ? (
            <div className={styles.heroStack}>
              {heroProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={`${styles.heroPhoto} ${styles[`heroPhoto${index + 1}`]}`}
                >
                  <img src={product.images[0]} alt={product.name} />
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyHero}>
              <ShoppingBag className="h-10 w-10 text-[#999] mb-3" />
              <span className="text-sm font-semibold">Explore our collection</span>
              <span className="text-xs text-[#999] mt-1">New arrivals coming soon</span>
            </div>
          )}
        </div>
        {heroProducts.length > 0 && (
          <div className={styles.heroDots}><span /><span /><span /></div>
        )}
      </section>
    </>
  )
}

export default async function HomePage() {
  const {
    categories, latestProducts, saleProducts, featuredProducts, bestSellers,
    heroImage, heroTitle, heroSubtitle, heroCTAText, heroCTASecondaryText,
    promoBannerText, promoBannerImage, promoBannerLink, promoBannerEnabled,
    sections, heroProducts, hasProducts,
  } = await getHomepageData()

  const sectionRenderers: Record<string, (section: HomepageSection) => React.ReactNode> = {
    hero: (s) => renderHeroSection(heroImage, heroTitle, heroSubtitle, heroCTAText, heroCTASecondaryText, heroProducts),
    categories: (s) => renderCategoriesSection(categories, s),
    sale_products: (s) => renderSaleProductsSection(saleProducts, s),
    new_arrivals: (s) => renderNewArrivalsSection(latestProducts, saleProducts, s),
    featured_products: (s) => renderFeaturedProductsSection(featuredProducts, s),
    best_sellers: (s) => renderBestSellersSection(bestSellers, s),
    promo_banner: (s) => renderPromoBannerSection(promoBannerEnabled, promoBannerText, promoBannerImage, promoBannerLink, s),
    quote: (s) => renderQuoteSection("", s),
  }

  return (
    <>
      {!hasProducts && sections.filter((s) => s.type === "hero").length > 0 && (
        <section className={styles.emptyState}>
          <div className={styles.emptyStateInner}>
            <h2>New collection arriving soon</h2>
            <p>Check back for fresh arrivals. In the meantime, explore our categories.</p>
            <div className={styles.emptyStateFeatures}>
              <div className={styles.emptyFeature}>
                <Shirt size={24} />
                <span>Curated fashion</span>
              </div>
              <div className={styles.emptyFeature}>
                <ShoppingBag size={24} />
                <span>Easy shopping</span>
              </div>
              <div className={styles.emptyFeature}>
                <PackageCheck size={24} />
                <span>Doorstep delivery</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {sections.map((section) => {
        const renderFn = sectionRenderers[section.type]
        const node = renderFn ? renderFn(section) : null
        return node ? <Fragment key={section.type}>{node}</Fragment> : null
      })}
    </>
  )
}
