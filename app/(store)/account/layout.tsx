"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { getCustomerPhone } from "@/lib/customer"
import { User, Package, Settings, LogOut, ChevronRight } from "lucide-react"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [phone, setPhone] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const p = getCustomerPhone()
    if (!p && pathname !== "/account/login") {
      router.push("/account/login")
      return
    }
    setPhone(p)
  }, [pathname, router])

  if (!mounted) return null
  if (!phone && pathname !== "/account/login") return null

  const navLinks = [
    { href: "/account", label: "Dashboard", icon: User },
    { href: "/account/orders", label: "My Orders", icon: Package },
    { href: "/account/profile", label: "Profile", icon: Settings },
  ]

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("doshok_customer_phone")
    }
    router.push("/account/login")
  }

  const isLoginPage = pathname === "/account/login"

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      {!isLoginPage && (
        <div className="flex items-start gap-8 lg:gap-12">
          {/* Sidebar */}
          <aside className="w-56 lg:w-64 shrink-0 hidden md:block">
            <nav className="space-y-1 sticky top-24">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4 px-3">
                Account
              </p>
              {navLinks.map((link) => {
                const Icon = link.icon
                const active = pathname === link.href || pathname.startsWith(link.href + "/")
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary/5 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
              <div className="border-t border-border/50 my-3" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </nav>
          </aside>

          {/* Mobile nav tabs */}
          <div className="md:hidden w-full">
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6 overflow-x-auto">
              {navLinks.map((link) => {
                const Icon = link.icon
                const active = pathname === link.href || pathname.startsWith(link.href + "/")
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
            <div className="flex-1 min-w-0">{children}</div>
          </div>

          {/* Desktop content */}
          <div className="flex-1 min-w-0 hidden md:block">{children}</div>
        </div>
      )}
      {isLoginPage && children}
    </div>
  )
}
