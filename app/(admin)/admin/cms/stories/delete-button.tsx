"use client"

import { Trash2 } from "lucide-react"
import { useActionState } from "react"
import { deleteStoryAction } from "./actions"

export function DeleteStoryButton({ id }: { id: string }) {
  const [, dispatch, pending] = useActionState(deleteStoryAction, null)

  function handleClick(e: React.MouseEvent) {
    if (!confirm("Delete this story?")) {
      e.preventDefault()
    }
  }

  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={handleClick}
        disabled={pending}
        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  )
}
