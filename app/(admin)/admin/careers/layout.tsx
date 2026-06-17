import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CareersLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("careers")
  return <>{children}</>
}
