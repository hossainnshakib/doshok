import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Briefcase, Grid3X3, Heart, ImageIcon, Shirt, ShoppingBag, Watch, Zap } from "lucide-react"
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
  const [categories, latestProducts, saleProducts, featuredProducts] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { published: true },
      include: { variants: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.product.findMany({
      where: { published: true, oldPrice: { not: null } },
      include: { variants: true, category: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { published: true, featured: true },
      include: { variants: true, category: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
  ])

  return { categories, latestProducts, saleProducts, featuredProducts }
}

function formatPrice(price: number) {
  return `৳${price.toLocaleString("en-IN")}`
}

function productStock(product: HomeProduct) {
  return product.variants.reduce((total, variant) => total + variant.stock, 0)
}

function ProductImage({ product }: { product: HomeProduct }) {
  const image = product.images[0]

  return (
    <div className={styles.cardImg}>
      {image ? (
        <img src={image} alt={product.name} loading="lazy" />
      ) : (
        <div className={styles.imageEmpty}>
          <span>Image coming soon</span>
        </div>
      )}
      <span className={styles.heart}>
        <Heart size={15} />
      </span>
    </div>
  )
}

function FlashCard({ product }: { product: HomeProduct }) {
  const stock = productStock(product)
  const discount = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <Link href={`/products/${product.slug}`} className={styles.card}>
      <ProductImage product={product} />
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{product.name}</div>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.oldPrice && product.oldPrice > product.price && (
            <span className={styles.priceOld}>{formatPrice(product.oldPrice)}</span>
          )}
        </div>
        <div className={styles.progress}>
          <i style={{ width: `${Math.max(12, Math.min(100, stock))}%` }} />
        </div>
        <div className={styles.saleMeta}>
          {discount > 0 ? `${discount}% off` : `${stock} in stock`}
        </div>
      </div>
    </Link>
  )
}

function TodayCard({ product }: { product: HomeProduct }) {
  const stock = productStock(product)

  return (
    <Link href={`/products/${product.slug}`} className={styles.card}>
      <ProductImage product={product} />
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{product.name}</div>
        <div className={styles.metaRow}>
          <span className={styles.star}>★</span>
          {product.category?.name ?? "Doshok"} · {stock > 0 ? `${stock} in stock` : "Sold out"}
        </div>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.oldPrice && product.oldPrice > product.price && (
            <span className={styles.priceOld}>{formatPrice(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  )
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

function StoreCard({ title, tag, letter, products }: { title: string; tag: string; letter: string; products: HomeProduct[] }) {
  return (
    <div className={styles.storeCard}>
      <div className={styles.storeHead}>
        <div className={styles.storeLogo}>
          {letter}
          <span className={styles.verify}>✓</span>
        </div>
        <div>
          <div className={styles.storeName}>{title}</div>
          <div className={styles.storeTag}>&quot;{tag}&quot;</div>
        </div>
      </div>
      <div className={styles.storeProds}>
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`} className={styles.storeProd}>
            <div className={styles.storeImg}>
              {product.images[0] ? (
                <img src={product.images[0]} alt={product.name} loading="lazy" />
              ) : (
                <div className={styles.imageEmpty}>
                  <ImageIcon size={18} />
                </div>
              )}
            </div>
            <div className={styles.storePrice}>{formatPrice(product.price)}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  const { categories, latestProducts, saleProducts, featuredProducts } = await getHomepageData()
  const flashProducts = (saleProducts.length > 0 ? saleProducts : latestProducts).slice(0, 4)
  const todayProducts = latestProducts.slice(0, 8)
  const heroProducts = [...latestProducts, ...featuredProducts].filter((product, index, list) => (
    product.images[0] && list.findIndex((item) => item.id === product.id) === index
  )).slice(0, 4)
  const storeProducts = (featuredProducts.length > 0 ? featuredProducts : latestProducts).slice(0, 12)
  const promoProduct = storeProducts.find((product) => product.images[0]) ?? storeProducts[0]

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}><span className={styles.hash}>#</span>Big Fashion Sale</div>
          <h1 className={styles.heroTitle}>Limited Time Offer!<br />Up to <em>50%</em> OFF!</h1>
          <div className={styles.sub}>Redefine Your Everyday Style</div>
          <div className={styles.ctaRow}>
            <Link href="/products" className={styles.btnPrimary}>Shop The Sale</Link>
            <Link href="/stories" className={styles.btnGhost}>View Lookbook</Link>
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
            <div className={styles.emptyHero}>Add product images to show this hero area</div>
          )}
        </div>
        <div className={styles.heroDots}><span /><span /><span /></div>
      </section>

      <section className={styles.categories}>
        {categories.map((category, index) => (
          <CategoryCard key={category.id} category={category} index={index} />
        ))}
        <Link href="/products" className={styles.cat}>
          <div className={styles.catIcon}><Grid3X3 size={22} /></div>
          <div className={styles.catLabel}>All Category</div>
        </Link>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionWrap}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>
              <span className={styles.bolt}><Zap size={16} fill="currentColor" /></span>
              Flash Sale
              <div className={styles.timer} aria-label="Sale products">
                <span className={styles.seg}>{flashProducts.length}</span>
                <span className={styles.colon}>items</span>
              </div>
            </div>
            <div className={styles.navArrows}>
              <Link href="/products" className={styles.arrow}>‹</Link>
              <Link href="/products" className={`${styles.arrow} ${styles.arrowDark}`}>›</Link>
            </div>
          </div>
          <div className={styles.row}>
            {flashProducts.map((product) => (
              <FlashCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionWrap} ${styles.sectionWhite}`}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>Todays For You!</div>
            <div className={styles.tabs}>
              <Link href="/products" className={`${styles.tab} ${styles.tabActive}`}>Best Seller</Link>
              <Link href="/new-arrivals" className={styles.tab}>New Arrivals</Link>
              <Link href="/products?discount=true" className={styles.tab}>Special Discount</Link>
              <Link href="/products?featured=true" className={styles.tab}>Doshok Picks</Link>
            </div>
          </div>
          <div className={styles.row} style={{ marginBottom: 16 }}>
            {todayProducts.slice(0, 4).map((product) => (
              <TodayCard key={product.id} product={product} />
            ))}
          </div>
          <div className={styles.row}>
            {todayProducts.slice(4, 8).map((product) => (
              <TodayCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

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
                  <div className={styles.imageEmpty}>Image coming soon</div>
                )}
              </div>
              <div>
                <div className={styles.pbTitle}>Doshok <em>Picks</em></div>
                <div className={styles.pbSub}>Curated sets for daily elegance<br />from real product data.</div>
              </div>
            </div>
            <div className={styles.bssGrid}>
              {[
                ["Featured Edit", "Selected from featured products", "F"],
                ["Latest Edit", "Newest Doshok arrivals", "N"],
                ["Sale Edit", "Products with active discounts", "S"],
                ["Essentials Edit", "Everyday wardrobe pieces", "E"],
              ].map(([title, tag, letter], index) => (
                <StoreCard key={title} title={title} tag={tag} letter={letter} products={storeProducts.slice(index * 3, index * 3 + 3)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quote}>
        <div className={styles.hangers} />
        <h2>&quot;Let&apos;s Shop Beyond Boundaries&quot;</h2>
      </section>
    </>
  )
}
