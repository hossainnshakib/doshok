import { describe, it, expect } from "vitest"
import { allocateOfferTotal, type AllocationUnit } from "@/lib/landing-pages/offer-allocation"

describe("allocateOfferTotal", () => {
  it("returns empty map for empty units", () => {
    const result = allocateOfferTotal([], 1500)
    expect(result.size).toBe(0)
  })

  it("returns empty map for negative offer price", () => {
    const units: AllocationUnit[] = [{ key: "a:0", regular: 850 }]
    const result = allocateOfferTotal(units, -100)
    expect(result.size).toBe(0)
  })

  it("allocates single unit at offer price", () => {
    const units: AllocationUnit[] = [{ key: "a:0", regular: 850 }]
    const result = allocateOfferTotal(units, 850)
    expect(result.get("a:0")).toBe(850)
  })

  it("allocates two units proportionally (850 + 790 = 1640, offer 1500)", () => {
    const units: AllocationUnit[] = [
      { key: "a:0", regular: 850 },
      { key: "b:0", regular: 790 },
    ]
    const result = allocateOfferTotal(units, 1500)
    // 850/1640 * 1500 = 777.439... → 777
    // 790/1640 * 1500 = 722.560... → 723 (gets the +1 remainder)
    expect(result.get("a:0")).toBe(777)
    expect(result.get("b:0")).toBe(723)
    expect(777 + 723).toBe(1500) // Sum exactly equals offer price
  })

  it("allocates three units with correct rounding", () => {
    const units: AllocationUnit[] = [
      { key: "a:0", regular: 850 },
      { key: "b:0", regular: 790 },
      { key: "c:0", regular: 500 },
    ]
    const result = allocateOfferTotal(units, 1500)
    const sum = (result.get("a:0") ?? 0) + (result.get("b:0") ?? 0) + (result.get("c:0") ?? 0)
    expect(sum).toBe(1500)
  })

  it("all allocated values are non-negative integers", () => {
    const units: AllocationUnit[] = [
      { key: "a:0", regular: 100 },
      { key: "b:0", regular: 200 },
    ]
    const result = allocateOfferTotal(units, 250)
    for (const [, value] of result) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  it("allocates zero when regular total is zero", () => {
    const units: AllocationUnit[] = [
      { key: "a:0", regular: 0 },
      { key: "b:0", regular: 0 },
    ]
    const result = allocateOfferTotal(units, 1500)
    expect(result.get("a:0")).toBe(0)
    expect(result.get("b:0")).toBe(0)
  })

  it("handles offer price lower than regular total (discount)", () => {
    const units: AllocationUnit[] = [
      { key: "a:0", regular: 1000 },
      { key: "b:0", regular: 1000 },
    ]
    const result = allocateOfferTotal(units, 1500)
    const sum = (result.get("a:0") ?? 0) + (result.get("b:0") ?? 0)
    expect(sum).toBe(1500)
    // Each should get 750
    expect(result.get("a:0")).toBe(750)
    expect(result.get("b:0")).toBe(750)
  })

  it("deterministic: same inputs always produce same output", () => {
    const units: AllocationUnit[] = [
      { key: "x:0", regular: 850 },
      { key: "y:0", regular: 790 },
    ]
    const r1 = allocateOfferTotal(units, 1500)
    const r2 = allocateOfferTotal(units, 1500)
    expect(r1.get("x:0")).toBe(r2.get("x:0"))
    expect(r1.get("y:0")).toBe(r2.get("y:0"))
  })
})
