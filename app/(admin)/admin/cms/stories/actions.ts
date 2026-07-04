"use server"

import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { redirect } from "next/navigation"

export async function deleteStoryAction(_prev: unknown, formData: FormData) {
  const session = await requireAdminPermission("cms")
  if (session instanceof Response) return null

  const id = formData.get("id") as string
  if (!id) return null

  await prisma.story.delete({ where: { id } })
  redirect("/admin/cms/stories")
}
