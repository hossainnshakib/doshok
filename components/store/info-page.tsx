import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"

export type InfoPageAction = {
  label: string
  href: string
  variant?: "primary" | "secondary"
}

export type InfoPageNavItem = {
  label: string
  href: string
}

export type InfoPageSection = {
  id?: string
  eyebrow?: string
  title: string
  body?: string[]
  bullets?: string[]
  cards?: {
    title: string
    body: string
    meta?: string
  }[]
  table?: {
    headers: string[]
    rows: string[][]
  }
  faqs?: {
    question: string
    answer: string
  }[]
}

export type InfoPageData = {
  eyebrow: string
  title: string
  description: string
  nav?: InfoPageNavItem[]
  actions?: InfoPageAction[]
  stats?: {
    value: string
    label: string
  }[]
  sections: InfoPageSection[]
}

export function InfoPage({ page }: { page: InfoPageData }) {
  const nav = page.nav ?? page.sections.filter((section) => section.id).map((section) => ({
    label: section.title,
    href: `#${section.id}`,
  }))

  return (
    <main className="bg-[#f7f5f1]">
      <section className="container mx-auto container-px pt-8 md:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#15191c] text-white shadow-2xl shadow-black/10">
          <div className="grid gap-8 p-7 md:grid-cols-[1.05fr_0.95fr] md:p-12 lg:p-16">
            <div className="flex min-h-[320px] flex-col justify-between">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                  {page.eyebrow}
                </p>
                <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
                  {page.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                  {page.description}
                </p>
              </div>
              {page.actions && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {page.actions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={
                        action.variant === "secondary"
                          ? "inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                          : "inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#15191c] transition hover:bg-white/90"
                      }
                    >
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-[1.6rem] bg-white/8 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_30%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#15191c]">
                  <Sparkles className="h-6 w-6" />
                </div>
                {page.stats && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {page.stats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <p className="text-2xl font-black">{stat.value}</p>
                        <p className="mt-1 text-xs leading-5 text-white/62">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px grid gap-6 py-8 md:grid-cols-[240px_1fr] md:py-12 lg:grid-cols-[280px_1fr]">
        {nav.length > 0 && (
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="overflow-x-auto rounded-[1.5rem] border border-black/5 bg-white p-2 shadow-sm md:p-3">
              <nav className="flex gap-2 md:flex-col">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 md:rounded-2xl"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <div className="space-y-5">
          {page.sections.map((section) => (
            <section
              key={section.id ?? section.title}
              id={section.id}
              className="scroll-mt-28 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-8"
            >
              {section.eyebrow && (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-red-500">
                  {section.eyebrow}
                </p>
              )}
              <h2 className="text-2xl font-black tracking-tight md:text-3xl">{section.title}</h2>
              {section.body && (
                <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-600 md:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}
              {section.bullets && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              )}
              {section.cards && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {section.cards.map((card) => (
                    <article key={card.title} className="rounded-[1.25rem] border border-black/5 bg-[#fbfaf7] p-5">
                      {card.meta && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{card.meta}</p>}
                      <h3 className="font-black tracking-tight">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">{card.body}</p>
                    </article>
                  ))}
                </div>
              )}
              {section.table && (
                <div className="mt-6 overflow-hidden rounded-[1.25rem] border border-black/5">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="bg-neutral-950 text-white">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 bg-white">
                        {section.table.rows.map((row) => (
                          <tr key={row.join("-")}>
                            {row.map((cell) => (
                              <td key={cell} className="px-4 py-3 text-neutral-600">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {section.faqs && (
                <div className="mt-6 space-y-3">
                  {section.faqs.map((faq, i) => (
                    <details key={`faq-${i}`} className="group rounded-2xl border border-black/5 bg-[#fbfaf7]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-bold">
                        {faq.question}
                        <span className="text-lg transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="border-t border-black/5 px-4 pb-4 pt-3 text-sm leading-6 text-neutral-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
