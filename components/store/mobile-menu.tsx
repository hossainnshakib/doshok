"use client"

import { startTransition, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, Search, Package, LogOut, ChevronRight } from "lucide-react"

const DEFAULT_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

const DEFAULT_QUICK_LINKS = [
  { href: "/help", label: "Help" },
  { href: "/policy", label: "Policy" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/size-guide", label: "Size Guide" },
  { href: "/care-guide", label: "Care Guide" },
  { href: "/track-order", label: "Track Order" },
]

type MenuItemData = {
  id: string
  title: string
  url: string
  target: string
  order: number
  parentId: string | null
  children: MenuItemData[]
}

function buildTree(items: MenuItemData[]): MenuItemData[] {
  const map = new Map<string, MenuItemData>()
  const roots: MenuItemData[] = []

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export function MobileMenu({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    startTransition(() => {
      setOpen(false)
    })
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  useEffect(() => {
    fetch("/api/menus?location=mobile")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
          setMenuItems(buildTree(d.data))
        }
      })
      .catch(() => {})
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const renderMenuItem = (item: MenuItemData, depth = 0) => {
    const hasChildren = item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const isExternal = item.target === "_blank"

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpand(item.id)}
            className={`flex items-center justify-between w-full px-4 py-3.5 rounded-lg text-sm font-medium transition-colors ${
              isExpanded
                ? "bg-primary/5 text-primary"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            }`}
          >
            <span>{item.title}</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-border/50 pl-2 mt-1 space-y-1">
              {item.children.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        onClick={() => setOpen(false)}
        className="flex items-center px-4 py-3.5 rounded-lg text-sm font-medium transition-colors text-foreground/80 hover:bg-muted hover:text-foreground"
      >
        {item.title}
      </Link>
    )
  }

  const menuItemNavs = menuItems
  const quickLinks = menuItems.length > 0 ? [] : DEFAULT_QUICK_LINKS

  const renderDefaultLink = (link: { href: string; label: string }) => {
    const active = pathname === link.href
    return (
      <Link
        key={`${link.href}-${link.label}`}
        href={link.href}
        onClick={() => setOpen(false)}
        className={`flex items-center px-4 py-3.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-primary/5 text-primary"
            : "text-foreground/80 hover:bg-muted hover:text-foreground"
        }`}
      >
        {link.label}
      </Link>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-1.5 hover:text-primary transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background md:hidden flex flex-col">
          <div className="flex items-center justify-between h-16 container-px border-b border-border/50">
            <span className="text-xl font-bold tracking-[0.15em]">DOSHOK</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 hover:text-primary transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.length > 0 ? (
              <>
                {menuItemNavs.map((item) => renderMenuItem(item))}
              </>
            ) : (
              <>
                {DEFAULT_NAV_LINKS.map(renderDefaultLink)}
              </>
            )}

            {quickLinks.length > 0 && (
              <>
                <div className="border-t border-border/50 my-3" />
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            )}

            <div className="border-t border-border/50 my-3" />

            {isLoggedIn ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <User className="h-4 w-4" />
                  My Account
                </Link>
                <Link
                  href="/account/orders"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Package className="h-4 w-4" />
                  Orders
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <User className="h-4 w-4" />
                  Sign Up
                </Link>
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Login
                </Link>
              </>
            )}
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
              Search
            </Link>
          </nav>

          <div className="border-t border-border/50 p-4 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Doshok. All rights reserved.
          </div>
        </div>
      )}
    </>
  )
}
