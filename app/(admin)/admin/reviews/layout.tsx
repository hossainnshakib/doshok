import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("support")
  return <>{children}</>
}
