"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import type { LucideIcon } from "lucide-react"
import {
  LogOut,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Truck,
  Pin,
  PinOff,
  Users,
  Briefcase,
  Headphones,
  Menu,
  X,
  Tag,
  Grid3x3,
  AlertTriangle,
  TrendingUp,
  Star,
  BriefcaseMedical,
  Home,
  Link2,
  FileText,
  BookOpen,
  CreditCard,
  PackageSearch,
  ClipboardList,
  MapPin,
  Ruler,
  ExternalLink,
  Download,
  Shield,
} from "lucide-react"
import { canAccessSection, hasSettingsAccess } from "@/lib/permissions"
import type { PermissionGroup } from "@/lib/permissions"

const STORAGE_KEY = "doshok_admin_sidebar_pinned"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  permission?: PermissionGroup | "operations"
}

interface NavGroup {
  label: string
  permission: PermissionGroup | "operations"
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    permission: "dashboard",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Commerce",
    permission: "commerce",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, permission: "products" },
      { href: "/admin/categories", label: "Categories", icon: Grid3x3, permission: "products" },
      { href: "/admin/size-charts", label: "Size Charts", icon: Ruler, permission: "products" },
      { href: "/admin/coupons", label: "Coupons", icon: Tag },
      { href: "/admin/landing-pages", label: "Landing Pages", icon: TrendingUp },
      { href: "/admin/commerce/import-export", label: "Import / Export", icon: Download },
    ],
  },
  {
    label: "Inventory",
    permission: "inventory",
    items: [
      { href: "/admin/inventory", label: "Stock Overview", icon: PackageSearch },
      { href: "/admin/inventory/movements", label: "Stock Movements", icon: ClipboardList },
      { href: "/admin/inventory/low-stock", label: "Low Stock Alerts", icon: AlertTriangle },
    ],
  },
  {
    label: "Sales",
    permission: "orders",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Customers",
    permission: "customers",
    items: [
      { href: "/admin/customers/list", label: "Customer List", icon: Users },
    ],
  },
  {
    label: "Support",
    permission: "support",
    items: [
      { href: "/admin/support", label: "Support", icon: Headphones },
    ],
  },
  {
    label: "Reviews",
    permission: "reviews",
    items: [
      { href: "/admin/reviews", label: "Product Reviews", icon: Star },
    ],
  },
  {
    label: "Careers",
    permission: "careers",
    items: [
      { href: "/admin/careers", label: "Career Posts", icon: BriefcaseMedical },
    ],
  },
  {
    label: "CMS",
    permission: "cms",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: Home },
      { href: "/admin/cms/footer", label: "Footer", icon: Link2 },
      { href: "/admin/cms/menus", label: "Menus", icon: Menu },
      { href: "/admin/cms/pages", label: "Pages", icon: FileText },
      { href: "/admin/cms/stories", label: "Stories", icon: BookOpen },
      { href: "/admin/cms/short-links", label: "Short Links", icon: ExternalLink },
    ],
  },
  {
    label: "Operations",
    permission: "operations",
    items: [
      { href: "/admin/payment-methods", label: "Payment Methods", icon: CreditCard },
      { href: "/admin/courier-methods", label: "Courier Methods", icon: Truck },
      { href: "/admin/delivery-zones", label: "Delivery Zones", icon: MapPin },
      { href: "/admin/checkout-settings", label: "Checkout Settings", icon: ClipboardList },
    ],
  },
  {
    label: "Settings",
    permission: "settings",
    items: [
      { href: "/admin/site-settings", label: "Site Settings", icon: Settings },
      { href: "/admin/settings/users", label: "Admin Users", icon: Shield },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [pinned, setPinned] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const userRole = session?.user?.role ?? "customer"

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "false") setPinned(false)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const expanded = pinned || hovered

  const canAccessNavPermission = (permission: PermissionGroup | "operations") => {
    if (permission === "operations") {
      return userRole === "super_admin" || userRole === "admin"
    }
    if (permission === "settings") {
      return hasSettingsAccess(userRole)
    }
    return canAccessSection(userRole, permission)
  }

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavPermission(item.permission ?? group.permission)),
    }))
    .filter((group) => group.items.length > 0)

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

  const currentTitle = visibleNavGroups
    .flatMap(g => g.items)
    .find(item => pathname === item.href || pathname.startsWith(item.href + "/"))
    ?.label ?? "Dashboard"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 md:flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-slate-900 text-white
          transition-all duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen md:shrink-0 md:border-r md:border-slate-800
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ width: expanded ? "17rem" : "4rem", minWidth: expanded ? "17rem" : "4rem" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-slate-800 px-3 gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-900 text-sm font-black">
              D
            </span>
            {expanded && (
              <div className="min-w-0">
                <span className="text-sm font-bold tracking-wide text-white">DOSHOK</span>
                <span className="block text-[10px] text-slate-500 font-medium">Admin</span>
              </div>
            )}
          </Link>
          {expanded && (
            <button
              onClick={togglePin}
              className="ml-auto shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
              title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
            >
              {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              {expanded && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
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

        <div className="border-t border-slate-800 px-2 py-3 shrink-0">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 ${
              !expanded ? "justify-center px-2" : ""
            }`}
            title="Logout"
          >
            <LogOut className="size-4 shrink-0" />
            {expanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/95 px-4 backdrop-blur-md shadow-sm md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-white text-xs font-black">D</span>
          <span className="text-sm font-semibold text-slate-800">{currentTitle}</span>
        </div>
      </div>

      <main className="flex-1 min-h-screen p-4 md:p-6 pt-20 md:pt-6">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  )
}

function NavLink({ href, icon: Icon, children, expanded }: { href: string; icon: LucideIcon; children: React.ReactNode; expanded: boolean }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href + "/"))
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
      } ${!expanded ? "justify-center px-2" : ""}`}
      title={typeof children === "string" ? children : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {expanded && <span className="truncate">{children}</span>}
    </Link>
  )
}
