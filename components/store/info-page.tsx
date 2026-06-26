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
      <section className="container mx-auto container-px pt-6 md:pt-12">
        <div className="overflow-hidden rounded-2xl bg-[#15191c] text-white shadow-2xl shadow-black/10 md:rounded-[2rem]">
          <div className={`grid gap-6 p-6 md:p-12 lg:p-16 ${page.stats ? "md:grid-cols-[1.05fr_0.95fr]" : "md:grid-cols-1"}`}>
            <div className={`flex min-h-[240px] flex-col justify-between ${page.stats ? "md:min-h-[320px]" : ""}`}>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 md:mb-4 md:text-xs">
                  {page.eyebrow}
                </p>
                <h1 className="max-w-3xl text-3xl font-black tracking-tight md:text-6xl lg:text-7xl">
                  {page.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68 md:mt-5 md:text-base md:leading-8 lg:text-lg">
                  {page.description}
                </p>
              </div>
              {page.actions && (
                <div className="mt-6 flex flex-wrap gap-2 md:mt-8 md:gap-3">
                  {page.actions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={
                        action.variant === "secondary"
                          ? "inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-5 text-xs font-semibold text-white transition hover:bg-white/10 md:h-12 md:px-6 md:text-sm"
                          : "inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-xs font-semibold text-[#15191c] transition hover:bg-white/90 md:h-12 md:px-6 md:text-sm"
                      }
                    >
                      {action.label}
                      <ArrowRight className="ml-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {page.stats && (
              <div className="relative min-h-[200px] overflow-hidden rounded-[1.2rem] bg-white/8 p-5 md:min-h-[300px] md:rounded-[1.6rem] md:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_30%)]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#15191c] md:h-14 md:w-14 md:rounded-2xl">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {page.stats.map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur md:rounded-2xl md:p-4">
                        <p className="text-lg font-black md:text-2xl">{stat.value}</p>
                        <p className="mt-1 text-[10px] leading-4 text-white/62 md:text-xs md:leading-5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px grid gap-5 py-6 md:grid-cols-[240px_1fr] md:gap-6 md:py-12 lg:grid-cols-[280px_1fr]">
        {nav.length > 0 && (
          <aside className="min-w-0 md:sticky md:top-24 md:self-start">
            <div className="max-w-full overflow-x-auto rounded-[1.25rem] border border-black/5 bg-white p-1.5 shadow-sm scrollbar-none md:rounded-[1.5rem] md:p-3">
              <nav className="flex w-max min-w-max gap-1.5 whitespace-nowrap md:w-auto md:min-w-0 md:flex-col md:gap-2">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 md:rounded-2xl md:px-4 md:py-2.5 md:text-sm"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <div className="min-w-0 space-y-4 md:space-y-5">
          {page.sections.map((section) => (
            <section
              key={section.id ?? section.title}
              id={section.id}
              className="scroll-mt-28 max-w-full rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm md:rounded-[1.75rem] md:p-8"
            >
              {section.eyebrow && (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-red-500 md:mb-3 md:text-xs">
                  {section.eyebrow}
                </p>
              )}
              <h2 className="text-xl font-black tracking-tight md:text-3xl">{section.title}</h2>
              {section.body && (
                <div className="mt-3 space-y-2.5 text-sm leading-7 text-neutral-600 md:mt-4 md:space-y-3 md:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}
              {section.bullets && (
                <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2 md:mt-5 md:gap-3">
                  {section.bullets.map((bullet) => (
                    <div key={bullet} className="flex min-w-0 gap-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700 md:gap-3 md:rounded-2xl md:p-4 md:text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 md:h-4 md:w-4" />
                      <span className="break-words">{bullet}</span>
                    </div>
                  ))}
                </div>
              )}
              {section.cards && (
                <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 md:mt-6 md:gap-4 xl:grid-cols-3">
                  {section.cards.map((card) => (
                    <article key={card.title} className="rounded-[1rem] border border-black/5 bg-[#fbfaf7] p-4 md:rounded-[1.25rem] md:p-5">
                      {card.meta && <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 md:mb-2 md:text-xs">{card.meta}</p>}
                      <h3 className="text-sm font-black tracking-tight md:text-base">{card.title}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-neutral-600 md:mt-2 md:text-sm md:leading-6">{card.body}</p>
                    </article>
                  ))}
                </div>
              )}
              {section.table && (
                <div className="mt-5 max-w-full overflow-x-auto rounded-[1rem] border border-black/5 md:mt-6 md:rounded-[1.25rem]">
                  <table className="w-full min-w-max text-left text-xs md:min-w-[560px] md:text-sm">
                    <thead className="bg-neutral-950 text-white">
                      <tr>
                        {section.table.headers.map((header) => (
                          <th key={header} className="break-words px-3 py-2.5 font-semibold md:px-4 md:py-3">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white">
                      {section.table.rows.map((row) => (
                        <tr key={row.join("-")}>
                          {row.map((cell) => (
                            <td key={cell} className="break-words px-3 py-2.5 text-neutral-600 md:px-4 md:py-3">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {section.faqs && (
                <div className="mt-5 space-y-2 md:mt-6 md:space-y-3">
                  {section.faqs.map((faq, i) => (
                    <details key={`faq-${i}`} className="group rounded-xl border border-black/5 bg-[#fbfaf7] md:rounded-2xl">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 text-xs font-bold md:gap-4 md:p-4 md:text-sm">
                        {faq.question}
                        <span className="text-base transition group-open:rotate-45 md:text-lg">+</span>
                      </summary>
                      <p className="border-t border-black/5 px-3.5 pb-3.5 pt-2.5 text-xs leading-5 text-neutral-600 md:px-4 md:pb-4 md:pt-3 md:text-sm md:leading-6">
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
