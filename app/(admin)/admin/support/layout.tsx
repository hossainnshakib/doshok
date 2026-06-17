import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function SupportLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("support")
  return <>{children}</>
}
