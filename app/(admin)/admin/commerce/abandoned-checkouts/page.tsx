"use client"

import { useEffect, useMemo, useState } from "react"
import { Clipboard, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

type AbandonedCheckoutRow = {
  id: string
  token: string
  name: string | null
  email: string | null
  phone: string | null
  couponCode: string | null
  total: number
  status: string
  orderId: string | null
  lastStep: string | null
  lastActivityAt: string
  expiresAt: string | null
  createdAt: string
  itemCount: number
  recoveryUrl: string
}

type ApiData = {
  checkouts: AbandonedCheckoutRow[]
  stats: Record<string, number>
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "recovered", label: "Recovered" },
  { value: "converted", label: "Converted" },
  { value: "expired", label: "Expired" },
]

const STATUS_ACTIONS = ["active", "recovered", "expired"] as const

function formatDate(value: string | null): string {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

export default function AdminAbandonedCheckoutsPage() {
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("status", status)
    params.set("page", String(page))
    if (search.trim()) params.set("search", search.trim())
    return params.toString()
  }, [status, search, page])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/abandoned-checkouts?${query}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data)
      })
      .finally(() => setLoading(false))
  }, [query])

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus)
    setPage(1)
  }

  async function updateStatus(id: string, nextStatus: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/abandoned-checkouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (!json.success) return
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          checkouts: prev.checkouts.map((row) => row.id === id ? { ...row, status: nextStatus } : row),
        }
      })
    } finally {
      setUpdatingId(null)
    }
  }

  async function copyLink(row: AbandonedCheckoutRow) {
    await navigator.clipboard.writeText(row.recoveryUrl)
    setCopiedId(row.id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const rows = data?.checkouts ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Abandoned Checkouts"
        description={`${total} checkout intent${total === 1 ? "" : "s"} matching the current view.`}
        backHref="/admin/products"
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => changeStatus(filter.value)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                status === filter.value
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200/60 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 md:w-80">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search name, email, phone, token"
            className="h-9 rounded-lg text-xs"
          />
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setPage(1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading...</div>
      ) : rows.length === 0 ? (
        <AdminEmptyState title="No abandoned checkouts found" description="Checkout intents matching this view will appear here." />
      ) : (
        <>
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Customer</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center">Items</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Total</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Activity</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Created</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="border-slate-50 hover:bg-slate-50/60">
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">{row.name || "Guest checkout"}</div>
                      <div className="text-[10px] text-slate-400">{row.email || row.phone || "-"}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums text-slate-600">{row.itemCount}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">৳{row.total.toLocaleString()}</TableCell>
                    <TableCell><AdminStatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs text-slate-500">{row.lastStep || "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(row.lastActivityAt)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 rounded-md px-2 text-[11px]" onClick={() => copyLink(row)}>
                          <Clipboard className="mr-1 h-3.5 w-3.5" />
                          {copiedId === row.id ? "Copied" : "Link"}
                        </Button>
                        {STATUS_ACTIONS.map((nextStatus) => (
                          <Button
                            key={nextStatus}
                            variant="outline"
                            size="sm"
                            disabled={updatingId === row.id || row.status === nextStatus || row.status === "converted"}
                            onClick={() => updateStatus(row.id, nextStatus)}
                            className="h-7 rounded-md px-2 text-[11px] capitalize"
                          >
                            {nextStatus}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 rounded-lg text-xs">
                Previous
              </Button>
              <span className="text-xs font-medium text-slate-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8 rounded-lg text-xs">
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
