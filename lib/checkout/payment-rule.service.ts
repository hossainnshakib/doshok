export type PaymentRuleType = "cod_only" | "full" | "partial_percent" | "fixed_advance" | "delivery_charge_only"

export const PAYMENT_RULE_VALUES: readonly PaymentRuleType[] = [
  "cod_only",
  "full",
  "partial_percent",
  "fixed_advance",
  "delivery_charge_only",
]

export const PAYMENT_RULE_LABELS: Record<PaymentRuleType, string> = {
  cod_only: "Cash on Delivery Only",
  full: "Full Payment",
  partial_percent: "Partial (% of total)",
  fixed_advance: "Fixed Advance (BDT)",
  delivery_charge_only: "Delivery Charge Only",
}

export const PAYMENT_RULE_DESCRIPTIONS: Record<PaymentRuleType, string> = {
  cod_only: "No advance payment required.",
  full: "Customer must pay the full amount online.",
  partial_percent: "Customer pays a percentage of the total online.",
  fixed_advance: "Customer pays a fixed amount online.",
  delivery_charge_only: "Customer pays only the delivery fee online.",
}

export const PAYMENT_RULE_SHORT_LABELS: Record<PaymentRuleType, string> = {
  cod_only: "COD Only",
  full: "Full",
  partial_percent: "Partial Percent",
  fixed_advance: "Fixed Advance",
  delivery_charge_only: "Delivery Charge Only",
}

export function getPaymentRuleLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return PAYMENT_RULE_LABELS[value as PaymentRuleType] ?? value
}

export function getPaymentRuleShortLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return PAYMENT_RULE_SHORT_LABELS[value as PaymentRuleType] ?? value
}

export type PaymentRuleSource = "product" | "global"

export type PaymentRuleInput = {
  grandTotal: number
  finalDeliveryFee: number
  discountedProductTotal: number
  rule: PaymentRuleType
  value?: number | null
}

export type PaymentRuleOutput = {
  paymentRule: PaymentRuleType
  paymentRuleValue: number | null
  payNow: number
  dueAmount: number
}

export type ResolvedPaymentRule = {
  source: PaymentRuleSource
  rule: PaymentRuleType
  value: number | null
}

export function calculatePaymentAmounts(input: PaymentRuleInput): PaymentRuleOutput {
  const { grandTotal, finalDeliveryFee, rule, value } = input

  let payNow: number

  switch (rule) {
    case "cod_only":
      payNow = 0
      break
    case "full":
      payNow = grandTotal
      break
    case "partial_percent": {
      const pct = value ?? 0
      payNow = Math.round(grandTotal * pct / 100)
      break
    }
    case "fixed_advance": {
      const fixed = value ?? 0
      payNow = Math.min(fixed, grandTotal)
      break
    }
    case "delivery_charge_only":
      payNow = finalDeliveryFee
      break
    default:
      payNow = 0
  }

  payNow = Math.max(0, Math.min(payNow, grandTotal))
  const dueAmount = Math.max(0, grandTotal - payNow)

  return {
    paymentRule: rule,
    paymentRuleValue: value ?? null,
    payNow,
    dueAmount,
  }
}

export function resolvePaymentRuleSource(params: {
  productOverride?: { rule: string | null; value: number | null } | null
  globalDefault: { rule: string; value: number | null }
}): ResolvedPaymentRule {
  const { productOverride, globalDefault } = params

  if (productOverride?.rule) {
    return {
      source: "product",
      rule: productOverride.rule as PaymentRuleType,
      value: productOverride.value,
    }
  }

  return {
    source: "global",
    rule: globalDefault.rule as PaymentRuleType,
    value: globalDefault.value,
  }
}

export function resolvePaymentRule(params: {
  grandTotal: number
  finalDeliveryFee: number
  discountedProductTotal: number
  productOverride?: { rule: string | null; value: number | null } | null
  globalDefault: { rule: string; value: number | null }
}): PaymentRuleOutput & { source: PaymentRuleSource } {
  const resolved = resolvePaymentRuleSource(params)
  const amounts = calculatePaymentAmounts({
    grandTotal: params.grandTotal,
    finalDeliveryFee: params.finalDeliveryFee,
    discountedProductTotal: params.discountedProductTotal,
    rule: resolved.rule,
    value: resolved.value,
  })
  return {
    paymentRule: amounts.paymentRule,
    paymentRuleValue: amounts.paymentRuleValue,
    payNow: amounts.payNow,
    dueAmount: amounts.dueAmount,
    source: resolved.source,
  }
}
