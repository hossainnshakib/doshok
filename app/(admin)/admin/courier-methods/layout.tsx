import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CourierMethodsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("operations")
  return <>{children}</>
}
