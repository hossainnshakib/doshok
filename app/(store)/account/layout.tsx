"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { SessionProvider, useSession, signOut } from "next-auth/react"
import { User, Package, Settings, LogOut, AlertTriangle, X, MapPin } from "lucide-react"
import { useState } from "react"

function AccountLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const isLoginPage = pathname === "/account/login"

  if (status === "loading") return null

  if (!session?.user && !isLoginPage) {
    router.push("/auth/login")
    return null
  }

  const isVerified = !!session?.user?.emailVerified
  const showBanner = !isVerified && !isLoginPage && !bannerDismissed

  const navLinks = [
    { href: "/account", label: "Dashboard", icon: User },
    { href: "/account/orders", label: "Orders", icon: Package },
    { href: "/account/addresses", label: "Addresses", icon: MapPin },
    { href: "/account/profile", label: "Profile", icon: Settings },
  ]

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      {showBanner && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1">
            Your email is not verified.{" "}
            <Link href="/account" className="font-medium underline underline-offset-2 hover:text-amber-900">
              Resend verification
            </Link>
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoginPage ? (
        children
      ) : (
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
    </div>
  )
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AccountLayoutContent>{children}</AccountLayoutContent>
    </SessionProvider>
  )
}
