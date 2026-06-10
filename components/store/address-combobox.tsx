"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type AddressOption = {
  id: string
  name: string
  nameBn?: string | null
}

type AddressComboboxProps = {
  options: AddressOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

export function AddressCombobox({
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  className,
  inputClassName,
}: AddressComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value)

  const filtered = query.trim()
    ? options.filter((opt) => {
        const q = query.toLowerCase()
        const nameMatch = opt.name.toLowerCase().includes(q)
        const bnMatch = opt.nameBn ? opt.nameBn.includes(query) : false
        return nameMatch || bnMatch
      })
    : options

  const handleSelect = useCallback((id: string) => {
    onChange(id)
    setOpen(false)
    setQuery("")
    inputRef.current?.blur()
  }, [onChange])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const displayLabel = selected
    ? selected.nameBn
      ? `${selected.name} (${selected.nameBn})`
      : selected.name
    : placeholder

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 text-sm transition-colors",
          "hover:border-muted-foreground/40",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer",
          inputClassName
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg shadow-black/5 ring-1 ring-black/5">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
            aria-label="Address options"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No results found
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors",
                      "hover:bg-muted/60",
                      opt.id === value && "bg-muted/40"
                    )}
                    role="option"
                    aria-selected={opt.id === value}
                  >
                    <span className="truncate">
                      {opt.nameBn ? `${opt.name} (${opt.nameBn})` : opt.name}
                    </span>
                    {opt.id === value && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}