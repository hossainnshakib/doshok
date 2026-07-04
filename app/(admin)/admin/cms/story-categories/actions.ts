"use server"

import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { redirect } from "next/navigation"

export async function deleteStoryCategoryAction(_prev: unknown, formData: FormData) {
  const session = await requireAdminPermission("cms")
  if (session instanceof Response) return null

  const id = formData.get("id") as string
  if (!id) return null

  const storyCount = await prisma.story.count({ where: { storyCategoryId: id } })
  if (storyCount > 0) {
    return { error: `Cannot delete category used by ${storyCount} story(ies). Reassign stories first.` }
  }

  await prisma.storyCategory.delete({ where: { id } })
  redirect("/admin/cms/story-categories")
}
