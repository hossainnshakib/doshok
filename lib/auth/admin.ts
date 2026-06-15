import { auth } from "@/lib/auth"
import { error } from "@/lib/api-response"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)
  if (session.user.role !== "admin") return error("Forbidden", 403)
  return session
}
