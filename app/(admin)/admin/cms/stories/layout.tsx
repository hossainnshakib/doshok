import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function CMSStoriesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("cms")
  return <>{children}</>
}
