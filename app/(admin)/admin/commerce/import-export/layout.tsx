import { requireAdminPagePermission } from "@/lib/auth/admin-page"

export default async function ImportExportLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPagePermission("import_export")
  return <>{children}</>
}
