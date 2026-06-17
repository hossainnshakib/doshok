import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function HomepageLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("cms")
  return <>{children}</>
}
