"use client"

import { startTransition, useEffect, useState } from "react"

type AnnouncementData = {
  text: string
  enabled: boolean
}

export function AnnouncementBar({ initial }: { initial?: { text: string; enabled: boolean } | null }) {
  const [data, setData] = useState<AnnouncementData>(
    initial ? { text: initial.text, enabled: initial.enabled } : { text: "", enabled: false }
  )

  useEffect(() => {
    if (initial) {
      startTransition(() => {
        setData({ text: initial.text, enabled: initial.enabled })
      })
      return
    }
    fetch("/api/homepage")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData({
            text: d.data?.announcementBarText ?? "",
            enabled: d.data?.announcementBarEnabled ?? false,
          })
        }
      })
      .catch(() => {})
  }, [initial])

  if (!data.enabled || !data.text) return null

  return (
    <div className="bg-neutral-950 text-white py-2 px-4 text-center">
      <span className="text-xs font-medium tracking-wide">{data.text}</span>
    </div>
  )
}
