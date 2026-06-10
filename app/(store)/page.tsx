import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ProductCard } from "@/components/store/product-card"
import { Briefcase, Grid3X3, ImageIcon, PackageCheck, Shirt, ShoppingBag, Watch } from "lucide-react"
import styles from "./page.module.css"

type HomeProduct = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  variants: { stock: number }[]
  category?: { name: string; slug: string } | null
}

type HomeCategory = {
  id: string
  name: string
  slug: string
  image: string | null
}

async function getHomepageData() {
  const [categories, latestProducts, saleProducts, homepageConfig] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "Active" },
      include: { variants: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.product.findMany({
      where: { status: "Active", oldPrice: { not: null } },
      include: { variants: true, category: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.homepageConfig.findUnique({
      where: { id: "homepage" },
    }),
  ])

  let featuredIds: string[] = []
  try {
    const parsed = JSON.parse(homepageConfig?.featuredIds ?? "[]")
    if (Array.isArray(parsed)) featuredIds = parsed
  } catch {}

  let featuredProducts: HomeProduct[] = []
  if (featuredIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: featuredIds }, status: "Active" },
      include: { variants: true, category: true },
    })
    const orderMap = new Map(featuredIds.map((id, index) => [id, index]))
    featuredProducts = products.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
  }

  return {
    categories,
    latestProducts,
    saleProducts,
    featuredProducts,
    heroImage: homepageConfig?.heroImage ?? null,
    promoBannerText: homepageConfig?.promoBannerText ?? "",
    promoBannerImage: homepageConfig?.promoBannerImage ?? null,
    promoBannerLink: homepageConfig?.promoBannerLink ?? "",
    promoBannerEnabled: homepageConfig?.promoBannerEnabled ?? false,
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

export default async function HomePage() {
  const { categories, latestProducts, saleProducts, featuredProducts, heroImage, promoBannerText, promoBannerImage, promoBannerLink, promoBannerEnabled } = await getHomepageData()
  const newArrivals = latestProducts.slice(0, 8)
  const discountedProducts = saleProducts.length > 0 ? saleProducts.slice(0, 4) : []
  const heroProducts = [...latestProducts, ...featuredProducts].filter((product, index, list) => (
    product.images[0] && list.findIndex((item) => item.id === product.id) === index
  )).slice(0, 4)
  const pickProducts = (featuredProducts.length > 0 ? featuredProducts : latestProducts).slice(0, 4)
  const promoProduct = pickProducts.find((product) => product.images[0]) ?? pickProducts[0]
  const hasProducts = latestProducts.length > 0

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
              Fashion with<br /><em>Purpose.</em>
            </h1>
            <p className={styles.sub}>
              Thoughtful silhouettes, clean essentials, and occasion-ready pieces — made for your wardrobe.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/products" className={styles.btnPrimary}>
                Shop Collection
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/about" className={styles.btnGhost}>About Us</Link>
            </div>
          </div>
        </section>
      )}

      <section className={styles.hero} style={heroImage ? { display: 'none' } : {}}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>
            <span className={styles.hash}>D</span>Style That Speaks
          </div>
          <h1 className={styles.heroTitle}>
            Fashion with<br /><em>Purpose.</em>
          </h1>
          <p className={styles.sub}>
            Thoughtful silhouettes, clean essentials, and occasion-ready pieces — made for your wardrobe.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/products" className={styles.btnPrimary}>
              Shop Collection
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <Link href="/about" className={styles.btnGhost}>About Us</Link>
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

      {!hasProducts && (
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

      {hasProducts && (
        <section className={styles.categories}>
          {categories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
          <Link href="/products" className={styles.cat}>
            <div className={styles.catIcon}><Grid3X3 size={22} /></div>
            <div className={styles.catLabel}>All Category</div>
          </Link>
        </section>
      )}

      {discountedProducts.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionWrap}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>
                <span className={styles.bolt}><PackageCheck size={16} /></span>
                Special Discount
              </div>
              <Link href="/products?discount=true" className={styles.viewAll}>
                View All <span className="inline-block ml-1">→</span>
              </Link>
            </div>
            <div className={styles.row}>
              {discountedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className={styles.section}>
          <div className={`${styles.sectionWrap} ${styles.sectionWhite}`}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>New Arrivals</div>
              <div className={styles.tabs}>
                <Link href="/new-arrivals" className={`${styles.tab} ${styles.tabActive}`}>New Arrivals</Link>
                <Link href="/products?featured=true" className={styles.tab}>Featured</Link>
                {discountedProducts.length > 0 && (
                  <Link href="/products?discount=true" className={styles.tab}>Discounted</Link>
                )}
              </div>
            </div>
            <div className={styles.row} style={{ marginBottom: 16 }}>
              {newArrivals.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className={styles.row}>
              {newArrivals.slice(4, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {pickProducts.length > 0 && (
        <section className={styles.section}>
          <div className={`${styles.sectionWrap} ${styles.sectionWhite}`}>
            <div className={styles.bssHead}>Doshok Picks</div>
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
                  <div className={styles.pbTitle}>Doshok <em>Picks</em></div>
                  <div className={styles.pbSub}>Curated sets for daily elegance<br />and effortless style.</div>
                </div>
              </div>
              <div className={styles.bssGrid}>
                {pickProducts.slice(0, 4).map((product, index) => (
                  <Link key={product.id} href={`/products/${product.slug}`} className={styles.storeCard}>
                    <div className={styles.storeHead}>
                      <div className={styles.storeLogo}>
                        {index + 1}
                      </div>
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
      )}

      {promoBannerEnabled && promoBannerText && (
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
      )}

      <section className={styles.quote}>
        <div className={styles.hangers} />
        <h2>&quot;Style That Speaks&quot;</h2>
      </section>
    </>
  )
}
