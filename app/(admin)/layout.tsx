import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdminRole } from "@/lib/permissions"

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || !isAdminRole(session.user.role) || session.user.isActive === false) {
    redirect("/admin/login")
  }

  return <>{children}</>
}
