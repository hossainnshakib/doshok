import { redirect } from "next/navigation"

export default function CustomersHubPage() {
  redirect("/admin/customers/list")
}