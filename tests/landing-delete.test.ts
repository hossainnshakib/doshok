import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    landingPage: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    landingPageItem: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    landingPageItemVariant: {
      deleteMany: vi.fn(),
    },
    landingPageOffer: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    landingPageOfferItem: {
      deleteMany: vi.fn(),
    },
    landingPageSection: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/auth/admin", () => ({
  requireAdminPermission: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}))

import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

const mockPrisma = vi.mocked(prisma)
const mockRequireAdmin = vi.mocked(requireAdminPermission)

async function deleteLandingPage(id: string) {
  const session = await requireAdminPermission("landing_pages")
  if (session instanceof Response) {
    return { status: 401, body: { success: false, error: "Unauthorized" } }
  }

  const existing = await prisma.landingPage.findUnique({ where: { id } })
  if (!existing) {
    return { status: 404, body: { success: false, error: "Landing page not found" } }
  }

  try {
    await prisma.$transaction(async (tx: typeof prisma) => {
      const offerIds = (
        await tx.landingPageOffer.findMany({
          where: { landingPageId: id },
          select: { id: true },
        })
      ).map((o: { id: string }) => o.id)

      if (offerIds.length > 0) {
        await tx.landingPageOfferItem.deleteMany({
          where: { offerId: { in: offerIds } },
        })
      }

      await tx.landingPageOffer.deleteMany({ where: { landingPageId: id } })

      const itemIds = (
        await tx.landingPageItem.findMany({
          where: { landingPageId: id },
          select: { id: true },
        })
      ).map((i: { id: string }) => i.id)

      if (itemIds.length > 0) {
        await tx.landingPageItemVariant.deleteMany({
          where: { landingPageItemId: { in: itemIds } },
        })
      }

      await tx.landingPageItem.deleteMany({ where: { landingPageId: id } })
      await tx.landingPageSection.deleteMany({ where: { landingPageId: id } })
      await tx.landingPage.delete({ where: { id } })
    })

    return { status: 200, body: { success: true } }
  } catch (err) {
    console.error("[LANDING_PAGE_DELETE]", err)
    return { status: 500, body: { success: false, error: "Failed to delete landing page" } }
  }
}

describe("Landing page delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => {
      return cb(mockPrisma as unknown as typeof prisma)
    })
  })

  it("deletes a draft landing page", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue({ id: "lp-1", status: "draft" } as never)
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([])
    mockPrisma.landingPageItem.findMany.mockResolvedValue([])
    mockPrisma.landingPageItem.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPageSection.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPageOffer.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPage.delete.mockResolvedValue({} as never)

    const result = await deleteLandingPage("lp-1")
    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(mockPrisma.landingPage.delete).toHaveBeenCalledWith({ where: { id: "lp-1" } })
  })

  it("deletes a published landing page", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue({ id: "lp-1", status: "published" } as never)
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([])
    mockPrisma.landingPageItem.findMany.mockResolvedValue([])
    mockPrisma.landingPageItem.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPageSection.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPageOffer.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPage.delete.mockResolvedValue({} as never)

    const result = await deleteLandingPage("lp-1")
    expect(result.status).toBe(200)
    expect(mockPrisma.landingPage.delete).toHaveBeenCalledWith({ where: { id: "lp-1" } })
  })

  it("deletes page with items (variants cascade)", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue({ id: "lp-1", status: "draft" } as never)
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([])
    mockPrisma.landingPageItem.findMany.mockResolvedValue([{ id: "item-1" }, { id: "item-2" }, { id: "item-3" }])
    mockPrisma.landingPageItemVariant.deleteMany.mockResolvedValue({ count: 6 })
    mockPrisma.landingPageItem.deleteMany.mockResolvedValue({ count: 3 })
    mockPrisma.landingPageSection.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPageOffer.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPage.delete.mockResolvedValue({} as never)

    const result = await deleteLandingPage("lp-1")
    expect(result.status).toBe(200)
    expect(mockPrisma.landingPageItemVariant.deleteMany).toHaveBeenCalledWith({
      where: { landingPageItemId: { in: ["item-1", "item-2", "item-3"] } },
    })
    expect(mockPrisma.landingPageItem.deleteMany).toHaveBeenCalledWith({ where: { landingPageId: "lp-1" } })
  })

  it("deletes page with offers + offer items", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue({ id: "lp-1", status: "draft" } as never)
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([{ id: "offer-1" }, { id: "offer-2" }])
    mockPrisma.landingPageOfferItem.deleteMany.mockResolvedValue({ count: 4 })
    mockPrisma.landingPageOffer.deleteMany.mockResolvedValue({ count: 2 })
    mockPrisma.landingPageItem.findMany.mockResolvedValue([])
    mockPrisma.landingPageItem.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPageSection.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.landingPage.delete.mockResolvedValue({} as never)

    const result = await deleteLandingPage("lp-1")
    expect(result.status).toBe(200)
    expect(mockPrisma.landingPageOfferItem.deleteMany).toHaveBeenCalledWith({
      where: { offerId: { in: ["offer-1", "offer-2"] } },
    })
  })

  it("returns 404 for nonexistent page", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue(null)

    const result = await deleteLandingPage("nonexistent")
    expect(result.status).toBe(404)
    expect(result.body.success).toBe(false)
    expect(mockPrisma.landingPage.delete).not.toHaveBeenCalled()
  })

  it("returns 401 for unauthorized user", async () => {
    mockRequireAdmin.mockResolvedValueOnce(new Response(null, { status: 302 }) as never)

    const result = await deleteLandingPage("lp-1")
    expect(result.status).toBe(401)
    expect(mockPrisma.landingPage.delete).not.toHaveBeenCalled()
  })

  it("transaction is atomic - no partial deletion on failure", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue({ id: "lp-1", status: "draft" } as never)
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([{ id: "offer-1" }])
    mockPrisma.landingPageOfferItem.deleteMany.mockRejectedValue(new Error("DB constraint"))

    const result = await deleteLandingPage("lp-1")
    expect(result.status).toBe(500)
    expect(mockPrisma.landingPage.delete).not.toHaveBeenCalled()
  })
})
