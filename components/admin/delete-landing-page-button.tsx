"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function DeleteLandingPageButton({
  pageId,
  pageTitle,
  onDeleted,
}: {
  pageId: string
  pageTitle: string
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete")
      }

      setOpen(false)
      toast.success("Landing page deleted")
      if (onDeleted) {
        onDeleted()
      } else {
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete landing page")
    } finally {
      setLoading(false)
    }
  }, [pageId, router, onDeleted])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) setOpen(v) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete landing page?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{pageTitle}&rdquo; and its landing-specific content
              and settings. Existing orders will not be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={loading} onClick={handleDelete}>
              {loading ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
