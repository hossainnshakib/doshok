"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

type FaqItem = {
  id: string
  question: string
  answer: string
}

export function FaqCompact({ heading, items }: { heading: string; items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <section className="bg-white border-t border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-5 md:py-6">
        <h3 className="text-[15px] font-bold text-stone-900 mb-3">{heading}</h3>
        <div className="space-y-px bg-stone-200">
          {items.map((item, i) => (
            <div key={item.id} className="bg-white">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[44px]"
              >
                <span className="text-[13px] font-medium text-stone-800 pr-3">{item.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-3">
                  <p className="text-[13px] text-stone-500 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
