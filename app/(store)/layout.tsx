import Link from "next/link"
import { Bell, ChevronDown, MapPin, Search, ShoppingCart, User } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { CartCount } from "@/components/store/cart-count"
import { MobileMenu } from "@/components/store/mobile-menu"
import { SiteFooter } from "@/components/store/site-footer"
import styles from "./layout.module.css"

async function getHeaderCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { name: "asc" },
      take: 8,
    })
  } catch {
    return []
  }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getHeaderCategories()

  return (
    <div className={styles.shell}>
      <div className={styles.page}>
        <header>
          <div className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <MapPin className="h-[13px] w-[13px]" />
              <span>Inside Chattogram delivery available</span>
            </div>
            <div className={styles.topbarRight}>
              <Link href="/help">Help</Link>
              <Link href="/policy">Policy</Link>
              <Link href="/about">About Doshok</Link>
              <Link href="/track-order">Track Order</Link>
              <span className={styles.divider} />
              <Link href="/account/login" className={styles.signup}>
                Sign Up
              </Link>
              <Link href="/account/login" className={styles.login}>Login</Link>
            </div>
          </div>

          <div className={styles.navbar}>
            <Link href="/" className={styles.logo}>
              <span className={styles.mark}>D</span>
              <span className={styles.word}>
                Doshok<span className="text-[#ee2c3c]">.</span>com
              </span>
            </Link>

            <form action="/search" className={styles.searchWrap}>
              <details className={styles.categoryDetails}>
                <summary className={styles.catSelect}>
                  <span>All Category</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </summary>
                <div className={styles.categoryMenu}>
                  <Link href="/products">All Products</Link>
                  {categories.map((category) => (
                    <Link key={category.id} href={`/products?category=${category.slug}`}>
                      {category.name}
                    </Link>
                  ))}
                </div>
              </details>
              <input
                name="q"
                type="search"
                placeholder="Search product or brand here..."
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn} aria-label="Search">
                <Search className="h-[18px] w-[18px]" />
              </button>
            </form>

            <div className={styles.navIcons}>
              <Link href="/cart" className={styles.iconBtn} aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                <CartCount />
              </Link>
              <Link href="/track-order" className={styles.iconBtn} aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Link>
              <Link href="/account" className={styles.iconBtn} aria-label="Account">
                <User className="h-5 w-5" />
              </Link>
              <MobileMenu />
            </div>
          </div>
        </header>

        <main>{children}</main>

        <SiteFooter />
      </div>
    </div>
  )
}
