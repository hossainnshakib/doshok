import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function PaymentMethodsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("operations")
  return <>{children}</>
}
