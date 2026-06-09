export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.PENDING]: "Pending",
  [PAYMENT_STATUS.PAID]: "Paid",
  [PAYMENT_STATUS.FAILED]: "Failed",
  [PAYMENT_STATUS.CANCELLED]: "Cancelled",
  [PAYMENT_STATUS.REFUNDED]: "Refunded",
}

export const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  [PAYMENT_STATUS.PENDING]: "secondary",
  [PAYMENT_STATUS.PAID]: "default",
  [PAYMENT_STATUS.FAILED]: "destructive",
  [PAYMENT_STATUS.CANCELLED]: "destructive",
  [PAYMENT_STATUS.REFUNDED]: "outline",
}