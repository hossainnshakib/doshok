import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, HelpCircle, Ruler, Shirt, Truck, MessageSquare } from "lucide-react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export const metadata: Metadata = {
  title: "Help Hub – Doshok",
  description: "Find answers, size guides, care instructions, order tracking, and support contact — all in one place.",
  alternates: { canonical: `${SITE_URL}/help` },
  openGraph: { title: "Help Hub – Doshok", description: "Find answers, size guides, care instructions, order tracking, and support contact — all in one place.", url: `${SITE_URL}/help` },
  twitter: { card: "summary_large_image", title: "Help Hub – Doshok", description: "Find answers, size guides, care instructions, order tracking, and support contact — all in one place." },
}

const helpTopics = [
  { title: "FAQ", href: "/faq", description: "Quick answers about orders, delivery, returns, payment, and account support.", icon: HelpCircle },
  { title: "Size Guide", href: "/size-guide", description: "Measurements and fit notes for tops, bottoms, and Doshok essentials.", icon: Ruler },
  { title: "Care Guide", href: "/care-guide", description: "Keep your pieces looking new with proper fabric care routines.", icon: Shirt },
  { title: "Track Order", href: "/track-order", description: "Follow your Doshok delivery with order number and phone.", icon: Truck },
  { title: "Contact", href: "/contact", description: "Get in touch with support for order help, questions, or feedback.", icon: MessageSquare },
]

export default function HelpHubPage() {
  return (
    <main className="bg-[#f7f5f1] min-h-screen">
      <section className="container mx-auto container-px pt-8 md:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#15191c] text-white shadow-2xl shadow-black/10">
          <div className="grid gap-8 p-7 md:grid-cols-[1.05fr_0.95fr] md:p-12 lg:p-16">
            <div className="flex min-h-[280px] flex-col justify-between">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                  Help Hub
                </p>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
                  How can we help you?
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                  Find answers, size guides, care instructions, order tracking, and support contact — all in one place.
                </p>
              </div>
            </div>
            <div className="relative min-h-[200px] overflow-hidden rounded-[1.6rem] bg-white/8 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_30%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#15191c]">
                  <HelpCircle className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px py-8 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {helpTopics.map((topic) => {
            const Icon = topic.icon
            return (
              <Link
                key={topic.href}
                href={topic.href}
                className="group rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">
                  {topic.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {topic.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-neutral-400 group-hover:text-primary transition-colors">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
