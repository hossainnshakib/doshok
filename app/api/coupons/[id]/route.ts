import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await requireAdminPermission("operations")
  if (session instanceof NextResponse) return session

  const coupon = await prisma.coupon.findUnique({ where: { id } })
  if (!coupon) return error("Not found", 404)
  return success(coupon)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const data: Record<string, unknown> = { ...body }
    if (data.expiresAt) data.expiresAt = new Date(data.expiresAt as string)
    if (data.code) data.code = (data.code as string).toUpperCase()
    const coupon = await prisma.coupon.update({ where: { id }, data })
    return success(coupon)
  } catch {
    return error("Failed to update coupon")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    await prisma.coupon.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete coupon")
  }
}
