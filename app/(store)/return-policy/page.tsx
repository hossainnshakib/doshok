import { permanentRedirect } from "next/navigation"

export default function ReturnPolicyRedirect() {
  permanentRedirect("/returns")
}