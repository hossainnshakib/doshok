"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown, Search, Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type DistrictOption = {
  id: string
  name: string
  nameBn?: string | null
}

export type DistrictValue = {
  districtId: string | null
  districtName: string
}

type DistrictComboboxProps = {
  options: DistrictOption[]
  value: DistrictValue
  onChange: (val: DistrictValue) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DistrictCombobox({
  options,
  value,
  onChange,
  placeholder = "Search district...",
  disabled = false,
  className,
}: DistrictComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSelectedKnown = value.districtId !== null && value.districtName !== ""
  const displayLabel = value.districtName || placeholder

  const filtered = query.trim()
    ? options.filter((opt) => {
        const q = query.toLowerCase()
        const nameMatch = opt.name.toLowerCase().includes(q)
        const bnMatch = opt.nameBn ? opt.nameBn.includes(query) : false
        return nameMatch || bnMatch
      })
    : options

  const customText = query.trim()
  const showCustomOption =
    customText.length > 0 &&
    !filtered.some((opt) => opt.name.toLowerCase() === customText.toLowerCase())

  const handleSelectKnown = useCallback(
    (opt: DistrictOption) => {
      onChange({ districtId: opt.id, districtName: opt.name })
      setOpen(false)
      setQuery("")
      inputRef.current?.blur()
    },
    [onChange]
  )

  const handleSelectCustom = useCallback(
    (text: string) => {
      onChange({ districtId: null, districtName: text.trim() })
      setOpen(false)
      setQuery("")
      inputRef.current?.blur()
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange({ districtId: null, districtName: "" })
    setQuery("")
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 text-sm transition-colors",
            "hover:border-muted-foreground/40",
            disabled && "cursor-not-allowed opacity-50",
            !disabled && "cursor-pointer"
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={cn("truncate", !value.districtName && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value.districtName && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Clear selection"
              >
                <span className="text-xs">&times;</span>
              </button>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>

        {value.districtId === null && value.districtName && !open && (
          <span className="absolute right-9 top-1/2 -translate-y-1/2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
            Custom
          </span>
        )}
      </div>

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
            aria-label="District options"
          >
            {filtered.length === 0 && !showCustomOption ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No districts found
              </li>
            ) : (
              <>
                {filtered.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectKnown(opt)}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors",
                        "hover:bg-muted/60",
                        opt.id === value.districtId && "bg-muted/40"
                      )}
                      role="option"
                      aria-selected={opt.id === value.districtId}
                    >
                      <span className="truncate">
                        {opt.nameBn ? `${opt.name} (${opt.nameBn})` : opt.name}
                      </span>
                      {opt.id === value.districtId && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                ))}
                {showCustomOption && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleSelectCustom(customText)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60 border-t border-border"
                      role="option"
                    >
                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate text-primary font-medium">
                        Use &ldquo;{customText}&rdquo;
                      </span>
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
