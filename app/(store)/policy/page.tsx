import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, FileText, RefreshCcw, Scale, Truck, Cookie, Accessibility } from "lucide-react"

export const metadata: Metadata = {
  title: "Policy Hub — Doshok",
  description: "Browse our privacy, return, terms, delivery, cookie, and accessibility policies so you always know where you stand.",
}

const policies = [
  { title: "Privacy Policy", href: "/privacy", description: "How we collect, use, and protect your personal data.", icon: FileText },
  { title: "Return Policy", href: "/returns", description: "Our 7-day return and exchange window, conditions, and process.", icon: RefreshCcw },
  { title: "Terms & Conditions", href: "/terms", description: "Site usage, orders, pricing, delivery, and legal terms.", icon: Scale },
  { title: "Delivery Policy", href: "/delivery", description: "Delivery zones, timelines, fees, and packaging information.", icon: Truck },
  { title: "Cookie Policy", href: "/cookies", description: "How cookies and similar storage are used on Doshok.", icon: Cookie },
  { title: "Accessibility", href: "/accessibility", description: "Our commitment to making shopping clear for everyone.", icon: Accessibility },
]

export default function PolicyHubPage() {
  return (
    <main className="bg-[#f7f5f1] min-h-screen">
      <section className="container mx-auto container-px pt-8 md:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#15191c] text-white shadow-2xl shadow-black/10">
          <div className="grid gap-8 p-7 md:grid-cols-[1.05fr_0.95fr] md:p-12 lg:p-16">
            <div className="flex min-h-[280px] flex-col justify-between">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                  Policy Hub
                </p>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
                  All Doshok policies in one place.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                  Browse our privacy, return, terms, delivery, cookie, and accessibility policies so you always know where you stand.
                </p>
              </div>
            </div>
            <div className="relative min-h-[200px] overflow-hidden rounded-[1.6rem] bg-white/8 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_30%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#15191c]">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px py-8 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => {
            const Icon = policy.icon
            return (
              <Link
                key={policy.href}
                href={policy.href}
                className="group rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">
                  {policy.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {policy.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-neutral-400 group-hover:text-primary transition-colors">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
