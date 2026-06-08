"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
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
} from "lucide-react"

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
      { href: "/admin/commerce", label: "Commerce Hub", icon: BarChart3 },
      { href: "/admin/sales", label: "Sales Hub", icon: BarChart3 },
      { href: "/admin/settings", label: "Settings Hub", icon: BarChart3 },
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
    ],
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-neutral-950 md:flex">
      <aside className="hidden w-72 flex-col border-r border-black/5 bg-[#111315] text-white md:flex">
        <div className="border-b border-white/10 p-6">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-lg font-black text-neutral-950">D</span>
            <span className="text-xl font-black tracking-[0.08em]">
              DOSHOK
            </span>
          </Link>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-white/40">Admin Panel</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/35">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} icon={item.icon}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-white text-neutral-950 shadow-lg shadow-black/20"
          : "text-white/58 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  )
}
