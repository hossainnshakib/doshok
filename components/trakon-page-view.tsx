"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { trackEvent } from "@/lib/trakon"

export function TrakonPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  useEffect(() => {
    const query = searchParams.toString()
    void trackEvent("PageView", {
      event_source_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
      email: session?.user?.email,
      phone: session?.user?.phone,
    })
  }, [pathname, searchParams, session?.user?.email, session?.user?.phone])

  return null
}
