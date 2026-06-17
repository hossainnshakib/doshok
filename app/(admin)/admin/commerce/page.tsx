import { redirect } from "next/navigation"
import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CommerceHubPage() {
  await requireAdminPagePermission("products")
  redirect("/admin/products")
}
