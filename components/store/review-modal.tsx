"use client"

import { startTransition, useEffect, useState } from "react"
import { Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ReviewModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  productId: string
  productName: string
  orderId: string
  existingReview?: { id: string; rating: number; title: string; content: string } | null
  mode?: "create" | "edit"
}

export function ReviewModal({
  open,
  onClose,
  onSuccess,
  productId,
  productName,
  orderId,
  existingReview,
  mode = "create",
}: ReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState(existingReview?.title ?? "")
  const [content, setContent] = useState(existingReview?.content ?? "")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (existingReview) {
      startTransition(() => {
        setRating(existingReview.rating)
        setTitle(existingReview.title)
        setContent(existingReview.content)
      })
    }
  }, [existingReview])

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setRating(existingReview?.rating ?? 0)
        setHoverRating(0)
        setTitle(existingReview?.title ?? "")
        setContent(existingReview?.content ?? "")
      })
    }
  }, [open, existingReview])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }
    if (!content.trim()) {
      toast.error("Please write your review")
      return
    }
    setSubmitting(true)
    try {
      const url = mode === "edit" && existingReview ? `/api/reviews/${existingReview.id}` : "/api/reviews"
      const method = mode === "edit" ? "PATCH" : "POST"
      const body = mode === "edit"
        ? { rating, title, content }
        : { productId, orderId, rating, title, content }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error ?? "Failed to submit review")
        return
      }
      toast.success(mode === "edit" ? "Review updated!" : "Review submitted! It will be visible after approval.")
      onSuccess()
      onClose()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold mb-1">
          {mode === "edit" ? "Edit Your Review" : "Write a Review"}
        </h2>
        <p className="text-sm text-muted-foreground mb-5 line-clamp-1">{productName}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">Your Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted text-muted"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Review Title <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Your Review</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your honest thoughts about this product..."
              rows={4}
              maxLength={1000}
              required
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{content.length}/1000</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 rounded-xl" disabled={submitting}>
              {submitting ? "Submitting..." : mode === "edit" ? "Update Review" : "Submit Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
