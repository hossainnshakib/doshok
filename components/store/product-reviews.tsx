"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

type Review = {
  id: string
  rating: number
  title: string | null
  content: string
  isVerifiedBuyer: boolean
  createdAt: string
  user: { name: string }
}

type ProductReviewsProps = {
  productId: string
  initialSummary?: { averageRating: number | null; reviewCount: number }
}

export function ProductReviews({ productId, initialSummary }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState(initialSummary ?? { averageRating: null, reviewCount: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchReviews(1)
  }, [productId])

  async function fetchReviews(p: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews/product/${productId}?page=${p}&limit=5`)
      const data = await res.json()
      if (data.success) {
        if (p === 1) {
          setReviews(data.data.reviews)
        } else {
          setReviews((prev) => [...prev, ...data.data.reviews])
        }
        setSummary(data.data.summary)
        setHasMore(p < data.data.pagination.totalPages)
        setPage(p)
      }
    } catch { }
    setLoading(false)
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <Star className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No reviews yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Be the first to review this product.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {summary.averageRating && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-lg font-black">{Number(summary.averageRating).toFixed(1)}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-3.5 w-3.5",
                  star <= Math.round(summary.averageRating!)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted"
                )}
              />
            ))}
          </div>
          <span className="text-muted-foreground">({summary.reviewCount} review{summary.reviewCount !== 1 ? "s" : ""})</span>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-border/50 p-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold">{review.user.name}</span>
              {review.isVerifiedBuyer && (
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  Verified
                </span>
              )}
              <span className="text-muted-foreground ml-auto">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3 w-3",
                    star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted"
                  )}
                />
              ))}
            </div>
            {review.title && <p className="mt-1 text-xs font-semibold">{review.title}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{review.content}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchReviews(page + 1)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {loading ? "Loading..." : "Load More Reviews"}
          </button>
        </div>
      )}
    </div>
  )
}
