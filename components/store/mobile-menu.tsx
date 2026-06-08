"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, Search } from "lucide-react"

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

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
            {[
              { href: "/", label: "Home" },
              { href: "/products", label: "Shop" },
              { href: "/new-arrivals", label: "New Arrivals" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ].map((link) => {
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
            })}

            <div className="border-t border-border/50 my-3" />

            {[
              { href: "/help", label: "Help Hub" },
              { href: "/policy", label: "Policy Hub" },
              { href: "/faq", label: "FAQ" },
              { href: "/size-guide", label: "Size Guide" },
              { href: "/care-guide", label: "Care Guide" },
              { href: "/track-order", label: "Track Order" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-border/50 my-3" />

            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              Account
            </Link>
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
