export type SectionType =
  | "hero"
  | "categories"
  | "sale_products"
  | "new_arrivals"
  | "featured_products"
  | "best_sellers"
  | "promo_banner"
  | "quote"
  | "from_the_journal"

export const SECTION_TYPES: SectionType[] = [
  "hero",
  "categories",
  "sale_products",
  "new_arrivals",
  "featured_products",
  "best_sellers",
  "promo_banner",
  "quote",
  "from_the_journal",
]

export interface HomepageSection {
  type: SectionType
  enabled: boolean
  title: string
  description: string
  sortOrder: number
  config: Record<string, unknown>
}

export function getDefaultSections(): HomepageSection[] {
  return [
    { type: "hero", enabled: true, title: "", description: "", sortOrder: 0, config: {} },
    { type: "categories", enabled: true, title: "Shop by Category", description: "", sortOrder: 10, config: { maxCategories: 8 } },
    { type: "sale_products", enabled: true, title: "Special Discount", description: "", sortOrder: 20, config: { maxProducts: 4 } },
    { type: "new_arrivals", enabled: true, title: "New Arrivals", description: "", sortOrder: 30, config: { maxProducts: 8 } },
    { type: "featured_products", enabled: true, title: "Doshok Picks", description: "Curated sets for daily elegance and effortless style.", sortOrder: 40, config: { maxProducts: 4 } },
    { type: "best_sellers", enabled: true, title: "Best Sellers", description: "", sortOrder: 45, config: { maxProducts: 8 } },
    { type: "promo_banner", enabled: true, title: "", description: "", sortOrder: 50, config: {} },
    { type: "quote", enabled: true, title: "Style That Speaks", description: "", sortOrder: 60, config: {} },
    { type: "from_the_journal", enabled: true, title: "From the Journal", description: "", sortOrder: 70, config: { maxStories: 3 } },
  ]
}

export function parseSections(raw: string | null | undefined): HomepageSection[] {
  if (!raw) return getDefaultSections()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return getDefaultSections()
  }
  if (!Array.isArray(parsed)) return getDefaultSections()
  if (parsed.length === 0) return getDefaultSections()

  const defaults = getDefaultSections()
  const defaultMap = new Map(defaults.map((s) => [s.type, s]))

  return parsed.map((item: unknown, index: number) => {
    if (!item || typeof item !== "object") return defaults[index] ?? defaults[0]
    const s = item as Record<string, unknown>
    const type = typeof s.type === "string" && SECTION_TYPES.includes(s.type as SectionType)
      ? (s.type as SectionType)
      : defaults[index]?.type ?? "hero"
    const def = defaultMap.get(type)
    return {
      type,
      enabled: typeof s.enabled === "boolean" ? s.enabled : (def?.enabled ?? true),
      title: typeof s.title === "string" ? s.title : (def?.title ?? ""),
      description: typeof s.description === "string" ? s.description : (def?.description ?? ""),
      sortOrder: typeof s.sortOrder === "number" ? Math.round(s.sortOrder) : (def?.sortOrder ?? index * 10),
      config: typeof s.config === "object" && s.config !== null && !Array.isArray(s.config)
        ? (s.config as Record<string, unknown>)
        : (def?.config ?? {}),
    }
  })
}

export function getEnabledSections(sections: HomepageSection[]): HomepageSection[] {
  const seen = new Set<SectionType>()
  return sections
    .filter((s) => s.enabled && !seen.has(s.type) && (seen.add(s.type), true))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
