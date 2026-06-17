import { redirect } from "next/navigation"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CMSHubPage() {
  await requireAdminPagePermission("cms")
  redirect("/admin/homepage")
}
