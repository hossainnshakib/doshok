"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AdminPageHeader, AdminTableShell, AdminStatusBadge, AdminPageShell, AdminEmptyState } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Check, X, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Review = {
  id: string
  rating: number
  title: string | null
  content: string
  status: string
  isVerifiedBuyer: boolean
  createdAt: string
  product: { id: string; name: string; slug: string; images: string[] }
  user: { name: string | null; email: string | null; firstName: string | null; lastName: string | null }
  order: { orderNumber: string }
}

type Stats = { pending: number; approved: number; rejected: number; total: number }

export default function AdminReviewsPage() {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("pending")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actioning, setActioning] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [status])

  async function fetchReviews() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reviews?status=${status}`)
      const data = await res.json()
      if (data.success) {
        setReviews(data.data.reviews)
        setStats(data.data.stats)
      }
    } catch { }
    setLoading(false)
  }

  async function handleBulkAction(action: "approve" | "reject" | "delete") {
    if (selected.size === 0) return
    setActioning(true)
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewIds: Array.from(selected) }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error)
        return
      }
      toast.success(`Updated ${data.data.count} review(s)`)
      setSelected(new Set())
      fetchReviews()
    } catch {
      toast.error("Failed to update reviews")
    } finally {
      setActioning(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === reviews.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(reviews.map((r) => r.id)))
    }
  }

  const tabs = [
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "all", label: "All", count: stats.total },
  ]

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Customers"
        title="Product Reviews"
        description="Manage customer reviews and ratings for products."
        backHref="/admin/customers"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 rounded-lg border border-slate-200/60 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                status === tab.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-8 rounded-md text-xs" onClick={() => handleBulkAction("approve")} disabled={actioning}>
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-md text-xs" onClick={() => handleBulkAction("reject")} disabled={actioning}>
              <X className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-md text-xs text-red-600 hover:text-red-700" onClick={() => handleBulkAction("delete")} disabled={actioning}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      <AdminTableShell>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <AdminEmptyState title="No reviews found" description="Customer reviews will appear here once submitted." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === reviews.length && reviews.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <>
                  <tr key={review.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(review.id)}
                        onChange={() => toggleSelect(review.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${review.product.id}`} className="font-medium hover:underline line-clamp-1 max-w-[200px]">
                        {review.product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{review.user.name ?? review.user.firstName ?? "Guest"}</p>
                      {review.user.email && <p className="text-xs text-slate-400">{review.user.email}</p>}
                      {review.isVerifiedBuyer && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Verified</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className={cn(
                              "h-3 w-3 rounded-full",
                              star <= review.rating ? "bg-amber-400" : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={review.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpanded(expanded === review.id ? null : review.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="View review"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {review.status !== "approved" && (
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/admin/reviews", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "approve", reviewId: review.id }),
                              })
                              const d = await res.json()
                              if (d.success) { toast.success("Review approved"); fetchReviews() }
                              else toast.error(d.error)
                            }}
                            className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {review.status !== "rejected" && (
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/admin/reviews", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "reject", reviewId: review.id }),
                              })
                              const d = await res.json()
                              if (d.success) { toast.success("Review rejected"); fetchReviews() }
                              else toast.error(d.error)
                            }}
                            className="p-1.5 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this review?")) return
                            const res = await fetch("/api/admin/reviews", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "delete", reviewId: review.id }),
                            })
                            const d = await res.json()
                            if (d.success) { toast.success("Review deleted"); fetchReviews() }
                            else toast.error(d.error)
                          }}
                          className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === review.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-slate-50/30">
                        <div className="pl-6 border-l-2 border-slate-200">
                          {review.title && <p className="font-semibold text-sm">{review.title}</p>}
                          <p className="text-sm text-slate-600 mt-1">{review.content}</p>
                          <p className="text-xs text-slate-400 mt-2">Order: {review.order.orderNumber}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableShell>
    </AdminPageShell>
  )
}