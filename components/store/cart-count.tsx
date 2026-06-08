"use client"

import { useEffect, useState } from "react"
import { getCartCount } from "@/lib/cart"

export function CartCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    function update() {
      setCount(getCartCount())
    }
    update()
    window.addEventListener("storage", update)
    window.addEventListener("cart-update", update)
    return () => {
      window.removeEventListener("storage", update)
      window.removeEventListener("cart-update", update)
    }
  }, [])

  if (count === 0) return null

  return (
    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full border border-white bg-[#ee2c3c] px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  )
}
