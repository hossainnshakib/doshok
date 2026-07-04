"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, FileEdit } from "lucide-react"
import { toast } from "sonner"

async function toggleStatus(_prev: unknown, formData: FormData) {
  const id = formData.get("id") as string
  const status = formData.get("status") as string
  try {
    const res = await fetch(`/api/stories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) {
      return { success: true }
    }
    return { error: data.error }
  } catch {
    return { error: "Something went wrong" }
  }
}

export function PublishButton({ id }: { id: string }) {
  const [state, dispatch, pending] = useActionState(toggleStatus, null)
  const router = useRouter()
  const notified = useRef(false)

  useEffect(() => {
    if (state?.success) {
      router.refresh()
    } else if (state?.error && !notified.current) {
      notified.current = true
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="active" />
      <button
        type="submit"
        disabled={pending}
        className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
        title="Publish"
      >
        <Check className="h-4 w-4" />
      </button>
    </form>
  )
}

export function DraftButton({ id }: { id: string }) {
  const [state, dispatch, pending] = useActionState(toggleStatus, null)
  const router = useRouter()
  const notified = useRef(false)

  useEffect(() => {
    if (state?.success) {
      router.refresh()
    } else if (state?.error && !notified.current) {
      notified.current = true
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="draft" />
      <button
        type="submit"
        disabled={pending}
        className="p-1.5 rounded-md text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
        title="Move to Draft"
      >
        <FileEdit className="h-4 w-4" />
      </button>
    </form>
  )
}
