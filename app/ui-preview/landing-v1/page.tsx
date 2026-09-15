import type { Metadata } from "next"
import { LandingV1View } from "@/components/ui-preview/landing-v1"

export const metadata: Metadata = {
  title: "DOSHOK — Amethyst Aura Collection",
  description:
    "Discover the Amethyst Aura collection by DOSHOK. Premium women's fashion with rich purple tones and intricate embroidery.",
  robots: "noindex, nofollow",
}

export default function LandingV1PreviewPage() {
  return <LandingV1View />
}
