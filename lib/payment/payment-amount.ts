export function resolvePaymentAmount(order: {
  payNow: number
  total: number
}): number {
  if (order.payNow > 0) return order.payNow
  return order.total
}
