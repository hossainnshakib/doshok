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
  ShoppingCart,
  ShoppingBag,
  TicketPercent,
  Settings,
  Truck,
  Pin,
  PinOff,
  Users,
  Briefcase,
  Headphones,
  FolderTree,
  Bell,
  Search,
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
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/commerce", label: "Commerce Hub", icon: Package },
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
    label: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers Hub", icon: Users },
    ],
  },
  {
    label: "CMS",
    items: [
      { href: "/admin/cms", label: "CMS Hub", icon: Briefcase },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/operations", label: "Operations Hub", icon: Truck },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/admin/support", label: "Support Hub", icon: Headphones },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings", label: "Settings Hub", icon: Settings },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pinned, setPinned] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const currentTitle = navGroups
    .flatMap(g => g.items)
    .find(item => pathname === item.href || pathname.startsWith(item.href + "/"))
    ?.label ?? "Dashboard"

  return (
    <div className="min-h-screen bg-[#f4f3f0] text-neutral-950 md:flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          bg-[#0f0f11] text-white
          transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen md:shrink-0 md:border-r md:border-white/[0.07]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ width: expanded ? "17rem" : "4rem", minWidth: expanded ? "17rem" : "4rem" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-white/[0.07] px-3 gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-base font-black text-neutral-950">
              D
            </span>
            {expanded && (
              <div className="min-w-0">
                <span className="text-lg font-black tracking-[0.06em] whitespace-nowrap">
                  DOSHOK
                </span>
                <span className="block text-[10px] text-white/30 font-medium tracking-wide">Admin Panel</span>
              </div>
            )}
          </Link>
          {expanded && (
            <button
              onClick={togglePin}
              className="ml-auto shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white"
              title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
            >
              {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
          )}
        </div>

        {/* Mobile header */}
        <div className="flex items-center justify-between px-3 py-4 md:hidden">
          <span className="text-sm font-bold">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="p-1 text-white/60">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {expanded && (
                <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
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

        {/* Bottom */}
        <div className="border-t border-white/[0.07] px-2.5 py-3 shrink-0">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/40 transition hover:bg-white/10 hover:text-white ${
              !expanded ? "justify-center px-2" : ""
            }`}
            title="Logout"
          >
            <LogOut className="size-4 shrink-0" />
            {expanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex h-14 items-center gap-3 border-b border-black/10 bg-white/90 px-4 backdrop-blur-md md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
        >
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <path d="M1 1h16M1 6h16M1 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-neutral-950 text-white text-xs font-black">D</span>
          <span className="text-sm font-bold">{currentTitle}</span>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-neutral-950 shadow-sm"
          : "text-white/50 hover:bg-white/[0.07] hover:text-white"
      } ${!expanded ? "justify-center px-2" : ""}`}
      title={typeof children === "string" ? children : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {expanded && <span className="truncate">{children}</span>}
    </Link>
  )
}
