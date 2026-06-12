import { permanentRedirect } from "next/navigation"

export default function ShippingRedirect() {
  permanentRedirect("/delivery")
}