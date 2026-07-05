import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { z } from "zod"
import { COURIER_PROVIDER_CODES } from "@/lib/courier"
import type { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

const courierProviderUpdateSchema = z.object({
  code: z.string(),
  name: z.string().min(1),
  isActive: z.boolean().optional().default(false),
  environment: z.enum(["sandbox", "live"]).optional().default("sandbox"),
  baseUrl: z.string().optional().nullable(),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    defaultStoreId: z.string().optional(),
  }).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
})

export async function GET() {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const providers = await prisma.courierProvider.findMany({
      orderBy: { createdAt: "asc" },
    })

    const result = providers.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      isActive: p.isActive,
      environment: p.environment,
      baseUrl: p.baseUrl,
      hasCredentials: !!(p.credentials && Object.keys(p.credentials as object).length > 0),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))

    return success(result)
  } catch {
    return error("Failed to fetch courier providers")
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = courierProviderUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const { code, ...data } = parsed.data

    if (!COURIER_PROVIDER_CODES.includes(code as "pathao")) {
      return error("Invalid courier provider code")
    }

    const cleanCredentials = data.credentials ? {
      clientId: data.credentials.clientId || undefined,
      clientSecret: data.credentials.clientSecret || undefined,
      username: data.credentials.username || undefined,
      password: data.credentials.password || undefined,
      defaultStoreId: data.credentials.defaultStoreId || undefined,
    } : undefined

    const provider = await prisma.courierProvider.upsert({
      where: { code },
      update: {
        name: data.name,
        isActive: data.isActive,
        environment: data.environment,
        baseUrl: data.baseUrl,
        credentials: cleanCredentials as Prisma.InputJsonValue | undefined,
        settings: data.settings as Prisma.InputJsonValue | undefined,
      },
      create: {
        code,
        name: data.name,
        isActive: data.isActive ?? false,
        environment: data.environment ?? "sandbox",
        baseUrl: data.baseUrl,
        credentials: cleanCredentials as Prisma.InputJsonValue | undefined,
        settings: data.settings as Prisma.InputJsonValue | undefined,
      },
    })

    return success({
      id: provider.id,
      code: provider.code,
      name: provider.name,
      isActive: provider.isActive,
      environment: provider.environment,
      baseUrl: provider.baseUrl,
      hasCredentials: !!(provider.credentials && Object.keys(provider.credentials as object).length > 0),
    })
  } catch {
    return error("Failed to update courier provider")
  }
}
