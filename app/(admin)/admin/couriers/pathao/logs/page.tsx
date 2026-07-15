"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AdminPageHeader, AdminBackLink, AdminTableShell, AdminEmptyState } from "@/components/admin/admin-ui"

type CourierLog = {
  id: string
  providerCode: string
  environment: string
  orderId: string | null
  action: string
  requestUrl: string | null
  requestMethod: string | null
  responseStatus: number | null
  errorMessage: string | null
  durationMs: number | null
  createdAt: string
  hasRequestBody: boolean
  hasResponseBody: boolean
}

const ACTIONS = ["all", "token_request", "create_order", "get_cities", "get_zones", "get_areas", "get_stores", "get_order_info"]
const STATUS_FILTERS = ["all", "success", "error"]

export default function AdminPathaoLogsPage() {
  const [logs, setLogs] = useState<CourierLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [environment, setEnvironment] = useState<string>("all")
  const [action, setAction] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const limit = 50

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      })
      if (environment !== "all") params.set("environment", environment)
      if (action !== "all") params.set("action", action)
      const url = `/api/admin/courier/pathao/logs?${params.toString()}`
      const res = await fetch(url)
      const d = await res.json()
      if (d.success) {
        let filteredLogs = d.data.logs as CourierLog[]
        if (statusFilter === "success") {
          filteredLogs = filteredLogs.filter(l => l.responseStatus !== null && l.responseStatus >= 200 && l.responseStatus < 400)
        } else if (statusFilter === "error") {
          filteredLogs = filteredLogs.filter(l => l.responseStatus === null || l.responseStatus >= 400)
        }
        setLogs(filteredLogs)
        setTotal(d.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(() => { void load() }) }, [page, environment, action, statusFilter])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString()
  }

  function getStatusBadge(status: number | null) {
    if (!status) return <Badge variant="outline" className="text-[10px]">—</Badge>
    if (status >= 200 && status < 300) {
      return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px]">{status}</Badge>
    }
    if (status >= 400 && status < 500) {
      return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px]">{status}</Badge>
    }
    return <Badge className="bg-red-50 text-red-700 hover:bg-red-50 text-[10px]">{status}</Badge>
  }

  function getEnvironmentBadge(env: string) {
    if (env === "sandbox") {
      return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px]">Sandbox</Badge>
    }
    return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[10px]">Live</Badge>
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Pathao Logs"
        description="View API request/response logs for Pathao courier integration."
        backHref="/admin/couriers/pathao"
      />
      <AdminBackLink href="/admin/couriers/pathao" label="Back to Pathao Settings" />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500">
          {total} log{total !== 1 ? "s" : ""} total
        </p>
        <select
          value={environment}
          onChange={(e) => { setEnvironment(e.target.value); setPage(0) }}
          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs"
        >
          <option value="all">All Environments</option>
          <option value="sandbox">Sandbox</option>
          <option value="live">Live</option>
        </select>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0) }}
          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs"
        >
          <option value="all">All Actions</option>
          <option value="token_request">Token Request</option>
          <option value="create_order">Create Order</option>
          <option value="get_cities">Get Cities</option>
          <option value="get_zones">Get Zones</option>
          <option value="get_areas">Get Areas</option>
          <option value="get_stores">Get Stores</option>
          <option value="get_order_info">Get Order Info</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success (2xx)</option>
          <option value="error">Error (4xx/5xx)</option>
        </select>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-7 w-7 rounded-md text-xs font-medium ${
                page === i ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {logs.length === 0 && !loading ? (
        <AdminEmptyState
          title="No logs found"
          description="No logs match your current filters."
        />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Env</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Time</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Action</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Order</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Method</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Duration</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell>{getEnvironmentBadge(log.environment)}</TableCell>
                  <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">{log.action}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500">{log.orderId || "—"}</TableCell>
                  <TableCell className="text-[11px]">
                    {log.requestMethod ? (
                      <span className={`font-semibold ${
                        log.requestMethod === "POST" ? "text-blue-600" :
                        log.requestMethod === "GET" ? "text-emerald-600" :
                        "text-slate-600"
                      }`}>
                        {log.requestMethod}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.responseStatus)}</TableCell>
                  <TableCell className="text-[11px] text-slate-500">
                    {log.durationMs ? `${log.durationMs}ms` : "—"}
                  </TableCell>
                  <TableCell className="text-[11px] text-red-600 max-w-[200px] truncate">
                    {log.errorMessage || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}
    </div>
  )
}
