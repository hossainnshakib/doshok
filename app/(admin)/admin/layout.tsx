"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { LucideIcon } from "lucide-react"
import {
  LogOut,
  LayoutDashboard,
  Package,
  FileText,
  FolderTree,
  ShoppingCart,
  ShoppingBag,
  TicketPercent,
  MapPin,
  Home,
  Settings,
  Wallet,
  Store,
  TrendingUp,
  SlidersHorizontal,
  Pin,
  PinOff,
  Truck,
} from "lucide-react"

const STORAGE_KEY = "doshok_admin_sidebar_pinned"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/commerce", label: "Commerce Hub", icon: Store },
      { href: "/admin/sales", label: "Sales Hub", icon: TrendingUp },
      { href: "/admin/settings", label: "Settings Hub", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/landing-pages", label: "Landing Pages", icon: FileText },
      { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/abandoned", label: "Abandoned Checkouts", icon: ShoppingBag },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: Home },
      { href: "/admin/site-settings", label: "Site Settings", icon: Settings },
      { href: "/admin/payment-methods", label: "Payment Methods", icon: Wallet },
      { href: "/admin/delivery-zones", label: "Delivery Zones", icon: MapPin },
      { href: "/admin/courier-methods", label: "Courier Methods", icon: Truck },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pinned, setPinned] = useState(true)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "false") setPinned(false)
  }, [])

  const expanded = pinned || hovered

  const togglePin = useCallback(() => {
    setPinned((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-neutral-950 md:flex">
      <aside
        className="hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r md:border-white/10 md:bg-[#111315] md:text-white transition-[width] duration-300"
        style={{ width: expanded ? "16rem" : "4rem", minWidth: expanded ? "16rem" : "4rem" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-base font-black text-neutral-950">
              D
            </span>
            {expanded && (
              <span className="text-lg font-black tracking-[0.08em] whitespace-nowrap">
                DOSHOK
              </span>
            )}
          </Link>
          {expanded && (
            <button
              onClick={togglePin}
              className="ml-auto shrink-0 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
              title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
            >
              {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {expanded && (
                <p className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-white/35">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} icon={item.icon} expanded={expanded}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-2 py-3 shrink-0">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-white/60 transition hover:bg-white/10 hover:text-white ${
              !expanded ? "justify-center" : ""
            }`}
            title="Logout"
          >
            <LogOut className="size-4 shrink-0" />
            {expanded && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 min-h-screen p-4 md:p-8">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </main>
    </div>
  )
}

function NavLink({ href, icon: Icon, children, expanded }: { href: string; icon: LucideIcon; children: React.ReactNode; expanded: boolean }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-white text-neutral-950 shadow-lg shadow-black/20"
          : "text-white/58 hover:bg-white/10 hover:text-white"
      } ${!expanded ? "justify-center px-2" : ""}`}
      title={typeof children === "string" ? children : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {expanded && <span className="truncate">{children}</span>}
    </Link>
  )
}
