"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"

export function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler() { setOpen(true) }
    window.addEventListener("open-search", handler)
    return () => window.removeEventListener("open-search", handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery("")
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hover:text-primary transition-colors sm:hidden"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background w-full max-w-2xl mx-4 mt-[15vh] rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4 border-b border-border/50" role="search">
              <label htmlFor="modal-search" className="sr-only">Search products</label>
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                id="modal-search"
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                autoComplete="off"
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close search"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </form>
            <div className="p-4 text-center text-sm text-muted-foreground">
              Press Enter to search for &ldquo;{query || "..."}&rdquo;
            </div>
          </div>
        </div>
      )}
    </>
  )
}
