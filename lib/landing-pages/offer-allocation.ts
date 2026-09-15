// Deterministic integer allocation of a fixed offer total across priced
// units, so OrderItem rows sum EXACTLY to the charged offer subtotal.
//
// Largest-remainder method on proportional shares: floor every share, hand
// the leftover units (+1 BDT each) to the largest fractional parts with a
// stable key tiebreak. Integer BDT only, never negative, deterministic.

export type AllocationUnit = {
  key: string
  regular: number
}

export function allocateOfferTotal(units: AllocationUnit[], offerPrice: number): Map<string, number> {
  const result = new Map<string, number>()
  if (units.length === 0 || offerPrice < 0) return result

  const regularTotal = units.reduce((sum, u) => sum + Math.max(0, u.regular), 0)
  if (regularTotal <= 0) {
    for (const u of units) result.set(u.key, 0)
    return result
  }

  const shares = units.map((u) => {
    const exact = (Math.max(0, u.regular) * offerPrice) / regularTotal
    const floored = Math.floor(exact)
    return { key: u.key, floored, fraction: exact - floored }
  })

  const remainder = offerPrice - shares.reduce((sum, s) => sum + s.floored, 0)

  const order = [...shares].sort((a, b) =>
    b.fraction !== a.fraction ? b.fraction - a.fraction : a.key < b.key ? -1 : 1
  )
  const bonus = new Set(order.slice(0, Math.max(0, remainder)).map((s) => s.key))

  for (const s of shares) {
    result.set(s.key, s.floored + (bonus.has(s.key) ? 1 : 0))
  }
  return result
}
