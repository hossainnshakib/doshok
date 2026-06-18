import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { normalizeLandingPageSetting } from "@/lib/landing-page-settings"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      category: true,
      specifications: { orderBy: { position: "asc" } },
      sizeCharts: { include: { sizeChart: true } },
        landingPageSetting: {
          include: {
            benefits: { orderBy: { sortOrder: "asc" } },
            faqItems: { orderBy: { sortOrder: "asc" } },
            testimonials: { orderBy: { sortOrder: "asc" } },
            galleryImages: { orderBy: { sortOrder: "asc" } },
          },
        },
        relatedProducts: {
        include: {
          relatedProduct: {
            include: {
              variants: true,
              category: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
      targetRelations: {
        include: {
          product: {
            include: {
              variants: true,
              category: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  })

  if (!product) return error("Not found", 404)
  if (product.status !== "Active") {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return error("Not found", 404)
  }

  const groupedRelations: Record<string, unknown[]> = {
    RELATED: [],
    CROSS_SELL: [],
    UPSELL: [],
  }

  product.relatedProducts.forEach((r) => {
    if (r.relatedProduct.status === "Active") {
      groupedRelations[r.type] = groupedRelations[r.type] || []
      groupedRelations[r.type].push(r.relatedProduct)
    }
  })

  product.targetRelations.forEach((r) => {
    if (r.product.status === "Active") {
      groupedRelations[r.type] = groupedRelations[r.type] || []
      groupedRelations[r.type].push(r.product)
    }
  })

  const { relatedProducts, targetRelations, ...productData } = product

  return success({ ...productData, relations: groupedRelations })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    const body = await request.json()

    const { variants, specifications, sizeChartIds, relatedProductIds, crossSellProductIds, upsellProductIds, landingPageSetting, ...productData } = body
    const existingProductForPrice = await prisma.product.findUnique({
      where: { id },
      select: { price: true, oldPrice: true, pageType: true },
    })

    // Guard: once LANDING, pageType is immutable
    if (existingProductForPrice?.pageType === "LANDING" && body.pageType && body.pageType !== "LANDING") {
      return error("Landing page type is locked and cannot be changed")
    }
    if (!existingProductForPrice) return error("Not found", 404)

    const nextPrice = typeof productData.price === "number" ? productData.price : existingProductForPrice.price
    const nextOldPrice = productData.oldPrice === undefined ? existingProductForPrice.oldPrice : productData.oldPrice
    if (typeof nextPrice !== "number" || nextPrice <= 0) {
      return error("Price must be a positive number")
    }
    if (nextOldPrice !== null && nextOldPrice !== undefined && nextOldPrice <= nextPrice) {
      return error("Compare price must be greater than the current price")
    }

    const normalizedLandingPageSetting = normalizeLandingPageSetting(landingPageSetting, nextPrice)
    if (!normalizedLandingPageSetting.success) return error(normalizedLandingPageSetting.error)

    if (variants && Array.isArray(variants)) {
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true, size: true, color: true },
      })
      const existingMap = new Map(
        existingVariants.map((v) => [`${v.size}::${v.color}`, v.id])
      )

      const upsertOps = variants.map(
        (v: { id?: string; size: string; color: string; colorHex?: string; stock: number; sku?: string; lowStockThreshold?: number }) => {
          const key = `${v.size}::${v.color}`
          const existingId = existingMap.get(key)
          return prisma.productVariant.upsert({
            where: existingId ? { id: existingId } : { id: "__never_match__" },
            create: {
              productId: id,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              sku: v.sku ?? null,
              lowStockThreshold: v.lowStockThreshold ?? 5,
            },
            update: {
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              sku: v.sku ?? null,
              lowStockThreshold: v.lowStockThreshold ?? 5,
            },
          })
        }
      )

      await prisma.$transaction(upsertOps)

      const submittedKeys = new Set(variants.map((v: { size: string; color: string }) => `${v.size}::${v.color}`))
      const toDelete = existingVariants.filter((v) => !submittedKeys.has(`${v.size}::${v.color}`))
      if (toDelete.length > 0) {
        await prisma.productVariant.deleteMany({
          where: { id: { in: toDelete.map((v) => v.id) } },
        })
      }
    }

    if (specifications !== undefined) {
      await prisma.productSpecification.deleteMany({ where: { productId: id } })
      if (specifications && specifications.length > 0) {
        await prisma.productSpecification.createMany({
          data: specifications.map((spec: { label: string; value: string }, index: number) => ({
            productId: id,
            label: spec.label,
            value: spec.value,
            position: index,
          })),
        })
      }
    }

    if (sizeChartIds !== undefined) {
      await prisma.productSizeChart.deleteMany({ where: { productId: id } })
      if (sizeChartIds && sizeChartIds.length > 0) {
        await prisma.productSizeChart.createMany({
          data: sizeChartIds.map((sizeChartId: string) => ({
            productId: id,
            sizeChartId,
          })),
        })
      }
    }

    if (relatedProductIds !== undefined || crossSellProductIds !== undefined || upsellProductIds !== undefined) {
      await prisma.productRelation.deleteMany({ where: { productId: id } })

      const relationsToCreate: { relatedProductId: string; type: string; position: number }[] = []

      if (relatedProductIds && Array.isArray(relatedProductIds)) {
        relatedProductIds.forEach((rid: string, idx: number) => {
          if (rid !== id) {
            relationsToCreate.push({ relatedProductId: rid, type: "RELATED", position: idx })
          }
        })
      }
      if (crossSellProductIds && Array.isArray(crossSellProductIds)) {
        crossSellProductIds.forEach((rid: string, idx: number) => {
          if (rid !== id) {
            relationsToCreate.push({ relatedProductId: rid, type: "CROSS_SELL", position: idx })
          }
        })
      }
      if (upsellProductIds && Array.isArray(upsellProductIds)) {
        upsellProductIds.forEach((rid: string, idx: number) => {
          if (rid !== id) {
            relationsToCreate.push({ relatedProductId: rid, type: "UPSELL", position: idx })
          }
        })
      }

      if (relationsToCreate.length > 0) {
        await prisma.productRelation.createMany({
          data: relationsToCreate.map((r) => ({
            productId: id,
            relatedProductId: r.relatedProductId,
            type: r.type,
            position: r.position,
          })),
        })
      }
    }

    if (landingPageSetting !== undefined) {
      if (Object.keys(normalizedLandingPageSetting.data).length > 0) {
        const lpsData = { ...normalizedLandingPageSetting.data }

        const { benefits, faqItems, testimonials, galleryImages, ...lpsFields } = lpsData

        const lpsRecord = await prisma.landingPageSetting.upsert({
          where: { productId: id },
          update: lpsFields,
          create: { productId: id, ...lpsFields },
        })

        if (benefits !== undefined) {
          const benefitList = benefits as { icon?: string; title: string; description?: string; enabled?: boolean; sortOrder?: number; id?: string }[]
          const existingBenefits = await prisma.landingBenefit.findMany({ where: { landingPageSettingId: lpsRecord.id }, select: { id: true } })
          const benefitIds = benefitList.filter((b) => b.id).map((b) => b.id as string)
          await prisma.landingBenefit.deleteMany({ where: { landingPageSettingId: lpsRecord.id, id: { notIn: benefitIds } } })
          for (const benefit of benefitList) {
            await prisma.landingBenefit.upsert({
              where: benefit.id ? { id: benefit.id } : { id: "__new__" },
              update: { icon: benefit.icon ?? null, title: benefit.title, description: benefit.description ?? null, enabled: benefit.enabled ?? true, sortOrder: benefit.sortOrder ?? 0 },
              create: { landingPageSettingId: lpsRecord.id, icon: benefit.icon ?? null, title: benefit.title, description: benefit.description ?? null, enabled: benefit.enabled ?? true, sortOrder: benefit.sortOrder ?? 0 },
            })
          }
        }

        if (faqItems !== undefined) {
          const faqList = faqItems as { question: string; answer: string; enabled?: boolean; sortOrder?: number; id?: string }[]
          const existingFaqs = await prisma.landingFaqItem.findMany({ where: { landingPageSettingId: lpsRecord.id }, select: { id: true } })
          const faqIds = faqList.filter((f) => f.id).map((f) => f.id as string)
          await prisma.landingFaqItem.deleteMany({ where: { landingPageSettingId: lpsRecord.id, id: { notIn: faqIds } } })
          for (const faq of faqList) {
            await prisma.landingFaqItem.upsert({
              where: faq.id ? { id: faq.id } : { id: "__new__" },
              update: { question: faq.question, answer: faq.answer, enabled: faq.enabled ?? true, sortOrder: faq.sortOrder ?? 0 },
              create: { landingPageSettingId: lpsRecord.id, question: faq.question, answer: faq.answer, enabled: faq.enabled ?? true, sortOrder: faq.sortOrder ?? 0 },
            })
          }
        }

        if (testimonials !== undefined) {
          const testimonialList = testimonials as { name: string; rating?: number; text: string; image?: string; enabled?: boolean; sortOrder?: number; id?: string }[]
          const existingTestimonials = await prisma.landingTestimonial.findMany({ where: { landingPageSettingId: lpsRecord.id }, select: { id: true } })
          const testimonialIds = testimonialList.filter((t) => t.id).map((t) => t.id as string)
          await prisma.landingTestimonial.deleteMany({ where: { landingPageSettingId: lpsRecord.id, id: { notIn: testimonialIds } } })
          for (const testimonial of testimonialList) {
            await prisma.landingTestimonial.upsert({
              where: testimonial.id ? { id: testimonial.id } : { id: "__new__" },
              update: { name: testimonial.name, rating: testimonial.rating ?? 5, text: testimonial.text, image: testimonial.image ?? null, enabled: testimonial.enabled ?? true, sortOrder: testimonial.sortOrder ?? 0 },
              create: { landingPageSettingId: lpsRecord.id, name: testimonial.name, rating: testimonial.rating ?? 5, text: testimonial.text, image: testimonial.image ?? null, enabled: testimonial.enabled ?? true, sortOrder: testimonial.sortOrder ?? 0 },
            })
          }
        }

        if (galleryImages !== undefined) {
          const imageList = galleryImages as { url: string; sortOrder?: number; id?: string }[]
          const existingImages = await prisma.landingGalleryImage.findMany({ where: { landingPageSettingId: lpsRecord.id }, select: { id: true } })
          const imageIds = imageList.filter((i) => i.id).map((i) => i.id as string)
          await prisma.landingGalleryImage.deleteMany({ where: { landingPageSettingId: lpsRecord.id, id: { notIn: imageIds } } })
          for (const img of imageList) {
            await prisma.landingGalleryImage.upsert({
              where: img.id ? { id: img.id } : { id: "__new__" },
              update: { url: img.url, sortOrder: img.sortOrder ?? 0 },
              create: { landingPageSettingId: lpsRecord.id, url: img.url, sortOrder: img.sortOrder ?? 0 },
            })
          }
        }
      } else {
        await prisma.landingPageSetting.deleteMany({ where: { productId: id } })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: {
        variants: true,
        category: true,
        specifications: { orderBy: { position: "asc" } },
        sizeCharts: { include: { sizeChart: true } },
      landingPageSetting: {
        include: {
          benefits: { orderBy: { sortOrder: "asc" } },
          faqItems: { orderBy: { sortOrder: "asc" } },
          testimonials: { orderBy: { sortOrder: "asc" } },
          galleryImages: { orderBy: { sortOrder: "asc" } },
        },
      },
        relatedProducts: {
          include: {
            relatedProduct: {
              include: { variants: true, category: true },
            },
          },
          orderBy: { position: "asc" },
        },
        targetRelations: {
          include: {
            product: {
              include: { variants: true, category: true },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    const groupedRelations: Record<string, unknown[]> = {
      RELATED: [],
      CROSS_SELL: [],
      UPSELL: [],
    }
    product.relatedProducts.forEach((r) => {
      if (r.relatedProduct.status === "Active") {
        groupedRelations[r.type] = groupedRelations[r.type] || []
        groupedRelations[r.type].push(r.relatedProduct)
      }
    })
    product.targetRelations.forEach((r) => {
      if (r.product.status === "Active") {
        groupedRelations[r.type] = groupedRelations[r.type] || []
        groupedRelations[r.type].push(r.product)
      }
    })

    const { relatedProducts, targetRelations, ...productDataRest } = product
    return success({ ...productDataRest, relations: groupedRelations })
  } catch {
    return error("Failed to update product")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    await prisma.product.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete product")
  }
}
