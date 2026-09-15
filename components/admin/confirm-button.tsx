"use client"

import { useState } from "react"

// Submit button with a native confirm dialog, for use inside server-action
// forms in Server Components (event handlers are not allowed inline there).
export function ConfirmSubmitButton({
  message,
  className,
  title,
  children,
}: {
  message: string
  className?: string
  title?: string
  children: React.ReactNode
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <button
      type="submit"
      className={className}
      title={title}
      disabled={confirming}
      onClick={(e) => {
        if (!confirm(message)) {
          e.preventDefault()
          return
        }
        setConfirming(true)
      }}
    >
      {children}
    </button>
  )
}
