"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { FaqItem } from "@/lib/landing-pages/types"
import { cn } from "@/lib/utils"

// Minimal accessible accordion (no accordion primitive exists in the app):
// native buttons give keyboard support; aria-expanded/controls wire state.
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null)

  return (
    <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
      {items.map((item) => {
        const open = openId === item.id
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                aria-expanded={open}
                aria-controls={`faq-panel-${item.id}`}
                id={`faq-button-${item.id}`}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/60"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{item.question}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
              </button>
            </h3>
            {open && (
              <div id={`faq-panel-${item.id}`} role="region" aria-labelledby={`faq-button-${item.id}`} className="px-4 pb-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-500">{item.answer}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
