type LandingSettingResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string }

const BOOLEAN_KEYS = [
  "paymentOverrideEnabled",
  "otpOverrideEnabled",
  "couponOverrideEnabled",
  "deliveryOverrideEnabled",
  "urgencyCounterEnabled",
  "hideNormalNavigation",
  "landingGalleryEnabled",
  "landingReviewsEnabled",
  "landingFaqEnabled",
  "landingHighlightsEnabled",
  "landingVariantSectionEnabled",
  "landingProductSummaryEnabled",
] as const

const STRING_KEYS = [
  "paymentRuleOverride",
  "autoCouponCode",
  "customCta",
  "customThankYouMessage",
  "landingGalleryPrimaryImage",
  "landingGallerySecondaryImage",
  "landingGalleryTertiaryImage",
  "landingGalleryVideoUrl",
  "landingOfferText",
  "landingGalleryLayout",
  "landingCheckoutTitle",
  "landingCheckoutSubtitle",
  "landingCheckoutCta",
] as const

const NUMBER_KEYS = [
  "paymentRuleValueOverride",
  "deliveryFeeOverride",
  "quantityLimit",
  "landingDisplayPrice",
  "landingDisplayOldPrice",
] as const

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function normalizeTestimonials(value: unknown): LandingSettingResult {
  if (value === null || value === undefined || value === "") return { success: true, data: { landingTestimonials: null } }

  const parsed = typeof value === "string" ? JSON.parse(value) : value
  if (!Array.isArray(parsed)) {
    return { success: false, error: "Landing testimonials must be a JSON array" }
  }

  const testimonials = parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each testimonial must be an object")
    }
    const record = item as Record<string, unknown>
    const name = normalizeNullableString(record.name ?? record.reviewerName)
    const text = normalizeNullableString(record.text ?? record.reviewText)
    const rating = normalizeNullableNumber(record.rating)
    if (!name || !text) {
      throw new Error("Each testimonial needs a reviewer name and review text")
    }
    if (rating === null || rating < 1 || rating > 5) {
      throw new Error("Each testimonial rating must be between 1 and 5")
    }

    return {
      name,
      text,
      rating,
      image: normalizeNullableString(record.image),
      visible: typeof record.visible === "boolean" ? record.visible : true,
      position: normalizeNullableNumber(record.position) ?? index,
    }
  })

  return { success: true, data: { landingTestimonials: testimonials } }
}

export function normalizeLandingPageSetting(input: unknown, productPrice: number): LandingSettingResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: true, data: {} }
  }

  const source = input as Record<string, unknown>
  const data: Record<string, unknown> = {}

  for (const key of BOOLEAN_KEYS) {
    if (key in source) data[key] = Boolean(source[key])
  }

  if ("otpOverride" in source) {
    data.otpOverride = typeof source.otpOverride === "boolean" ? source.otpOverride : null
  }

  for (const key of STRING_KEYS) {
    if (key in source) data[key] = normalizeNullableString(source[key])
  }

  for (const key of NUMBER_KEYS) {
    if (key in source) {
      const normalized = normalizeNullableNumber(source[key])
      if (source[key] !== null && source[key] !== undefined && source[key] !== "" && normalized === null) {
        return { success: false, error: `${key} must be a non-negative whole number` }
      }
      data[key] = normalized
    }
  }

  if ("landingTestimonials" in source) {
    try {
      const testimonials = normalizeTestimonials(source.landingTestimonials)
      if (!testimonials.success) return testimonials
      Object.assign(data, testimonials.data)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Invalid landing testimonials" }
    }
  }

  const displayPrice = (data.landingDisplayPrice as number | null | undefined) ?? productPrice
  const displayOldPrice = data.landingDisplayOldPrice as number | null | undefined
  if (displayOldPrice !== null && displayOldPrice !== undefined && displayOldPrice <= displayPrice) {
    return { success: false, error: "Landing compare price must be greater than the landing/current price" }
  }

  if (source.benefits !== undefined) {
    const benefits = source.benefits as unknown[]
    if (Array.isArray(benefits)) {
      data.benefits = benefits.map((b) => {
        const item = b as Record<string, unknown>
        return {
          id: item.id as string | undefined,
          icon: item.icon ? String(item.icon).trim() || null : null,
          title: String(item.title ?? "").trim(),
          description: item.description ? String(item.description).trim() || null : null,
          enabled: typeof item.enabled === "boolean" ? item.enabled : true,
          sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
        }
      }).filter((b) => b.title)
    } else {
      data.benefits = []
    }
  }

  if (source.faqItems !== undefined) {
    const faqItems = source.faqItems as unknown[]
    if (Array.isArray(faqItems)) {
      data.faqItems = faqItems.map((f) => {
        const item = f as Record<string, unknown>
        return {
          id: item.id as string | undefined,
          question: String(item.question ?? "").trim(),
          answer: String(item.answer ?? "").trim(),
          enabled: typeof item.enabled === "boolean" ? item.enabled : true,
          sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
        }
      }).filter((f) => f.question && f.answer)
    } else {
      data.faqItems = []
    }
  }

  if (source.testimonials !== undefined) {
    const testimonials = source.testimonials as unknown[]
    if (Array.isArray(testimonials)) {
      data.testimonials = testimonials.map((t) => {
        const item = t as Record<string, unknown>
        return {
          id: item.id as string | undefined,
          name: String(item.name ?? "").trim(),
          rating: typeof item.rating === "number" ? Math.max(1, Math.min(5, Math.round(item.rating))) : 5,
          text: String(item.text ?? "").trim(),
          image: item.image ? String(item.image).trim() || null : null,
          enabled: typeof item.enabled === "boolean" ? item.enabled : true,
          sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
        }
      }).filter((t) => t.name && t.text)
    } else {
      data.testimonials = []
    }
  }

  if (source.galleryImages !== undefined) {
    const galleryImages = source.galleryImages as unknown[]
    if (Array.isArray(galleryImages)) {
      data.galleryImages = galleryImages.map((g) => {
        const item = g as Record<string, unknown>
        return {
          id: item.id as string | undefined,
          url: String(item.url ?? "").trim(),
          sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
        }
      }).filter((g) => g.url)
    } else {
      data.galleryImages = []
    }
  }

  if (source.landingSectionOrder !== undefined) {
    const sectionOrder = source.landingSectionOrder as unknown
    if (Array.isArray(sectionOrder)) {
      data.landingSectionOrder = sectionOrder.map((s) => ({
        key: String((s as Record<string, unknown>).key ?? "").trim(),
        enabled: typeof (s as Record<string, unknown>).enabled === "boolean" ? (s as Record<string, unknown>).enabled : true,
        order: typeof (s as Record<string, unknown>).order === "number" ? (s as Record<string, unknown>).order : 0,
        title: (s as Record<string, unknown>).title ? String((s as Record<string, unknown>).title).trim() || null : null,
        subtitle: (s as Record<string, unknown>).subtitle ? String((s as Record<string, unknown>).subtitle).trim() || null : null,
      })).filter((s) => s.key)
    }
  }

  return { success: true, data }
}
