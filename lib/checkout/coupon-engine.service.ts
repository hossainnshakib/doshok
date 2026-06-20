const SCOPE_PRODUCT = "product"
const SCOPE_DELIVERY = "delivery"

export type CouponScope = typeof SCOPE_PRODUCT | typeof SCOPE_DELIVERY

export type CouponInput = {
  scope?: string | null
  type: string
  discount: number
}

export type ScopedCouponResult = {
  couponCode?: string
  couponScope: CouponScope
  productDiscount: number
  deliveryDiscount: number
  discountedProductTotal: number
  finalDeliveryFee: number
  totalDiscount: number
  grandTotal: number
}

function resolveScope(coupon: CouponInput): CouponScope {
  if (coupon.scope === SCOPE_DELIVERY) return SCOPE_DELIVERY
  return SCOPE_PRODUCT
}

export function calculateProductCouponDiscount(
  coupon: CouponInput,
  productSubtotal: number
): number {
  if (coupon.type === "percent") {
    const pct = Math.min(coupon.discount, 100)
    return Math.round(productSubtotal * pct / 100)
  }
  return Math.min(coupon.discount, productSubtotal)
}

export function calculateDeliveryCouponDiscount(
  coupon: CouponInput,
  deliveryFee: number
): number {
  if (coupon.type === "percent") {
    const pct = Math.min(coupon.discount, 100)
    return Math.round(deliveryFee * pct / 100)
  }
  return Math.min(coupon.discount, deliveryFee)
}

export function applyScopedCoupon(params: {
  coupon: CouponInput
  productSubtotal: number
  deliveryFee: number
  couponCode?: string
}): ScopedCouponResult {
  const { coupon, productSubtotal, deliveryFee, couponCode } = params
  const scope = resolveScope(coupon)

  let productDiscount = 0
  let deliveryDiscount = 0

  if (scope === SCOPE_PRODUCT) {
    productDiscount = calculateProductCouponDiscount(coupon, productSubtotal)
  } else {
    deliveryDiscount = calculateDeliveryCouponDiscount(coupon, deliveryFee)
  }

  const discountedProductTotal = Math.max(0, productSubtotal - productDiscount)
  const finalDeliveryFee = Math.max(0, deliveryFee - deliveryDiscount)
  const totalDiscount = productDiscount + deliveryDiscount
  const grandTotal = Math.max(0, discountedProductTotal + finalDeliveryFee)

  return {
    couponCode,
    couponScope: scope,
    productDiscount,
    deliveryDiscount,
    discountedProductTotal,
    finalDeliveryFee,
    totalDiscount,
    grandTotal,
  }
}
