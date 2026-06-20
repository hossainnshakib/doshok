"use client"

import { startTransition, useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { X, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type SelectorProduct = {
  id: string
  name: string
  slug: string
  price: number
  oldPrice: number | null
  images: string[]
  status: string
  variants: { stock: number }[]
}

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  excludeId: string
  label: string
}

export function ProductRelationSelector({ selectedIds, onChange, excludeId, label }: Props) {
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SelectorProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const [selectedProducts, setSelectedProducts] = useState<SelectorProduct[]>([])

  useEffect(() => {
    if (selectedIds.length === 0) {
      startTransition(() => {
        setSelectedProducts([])
      })
      return
    }
    const idsParam = selectedIds.join(",")
    fetch(`/api/products?selector=true&status=Active&ids=${idsParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSelectedProducts(data.data)
        }
      })
      .catch(() => {})
  }, [selectedIds])

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSearchResults([])
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/products?selector=true&search=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success) {
          setSearchResults(data.data.filter((p: SelectorProduct) => p.id !== excludeId && !selectedIds.includes(p.id)))
        }
      } catch { }
      setLoading(false)
    },
    [excludeId, selectedIds]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) doSearch(search)
      else setSearchResults([])
    }, 300)
    return () => clearTimeout(timer)
  }, [search, doSearch])

  function addProduct(product: SelectorProduct) {
    onChange([...selectedIds, product.id])
    setSearch("")
    setSearchResults([])
    setShowDropdown(false)
  }

  function removeProduct(id: string) {
    onChange(selectedIds.filter((i) => i !== id))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search products to add..."
          className="h-8 pl-8 text-xs"
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                {p.images && p.images[0] ? (
                  <img src={p.images[0]} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded bg-slate-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400">৳{p.price.toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {showDropdown && search.length >= 2 && !loading && searchResults.length === 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
            <p className="text-xs text-slate-400">No products found</p>
          </div>
        )}
      </div>

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              {p.images && p.images[0] ? (
                <img src={p.images[0]} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded bg-slate-200 shrink-0" />
              )}
              <span className="text-[11px] font-medium text-slate-700 max-w-[120px] truncate">{p.name}</span>
              <span className="text-[10px] text-slate-400">৳{p.price.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => removeProduct(p.id)}
                className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedProducts.length === 0 && (
        <p className="text-[11px] text-slate-400">Search and select products to add to {label.toLowerCase()}.</p>
      )}
    </div>
  )
}
