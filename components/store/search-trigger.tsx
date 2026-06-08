"use client"

import { Search } from "lucide-react"

export function SearchTrigger() {
  return (
    <button
      onClick={() => {
        const event = new CustomEvent("open-search")
        window.dispatchEvent(event)
      }}
      className="hover:text-primary transition-colors hidden sm:block"
      aria-label="Search"
    >
      <Search className="h-[18px] w-[18px]" />
    </button>
  )
}
