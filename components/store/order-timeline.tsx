import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/types"
import type { OrderStatus } from "@/types"

const TERMINAL_STATUSES = ["cancelled", "returned"] as const

export function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const normalized = currentStatus.toLowerCase() as OrderStatus

  if ((TERMINAL_STATUSES as readonly string[]).includes(normalized)) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 ring-2 ring-red-200">
              <span className="text-base font-bold">✕</span>
            </div>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-red-600">
              {ORDER_STATUS_LABELS[normalized] || currentStatus}
            </p>
          </div>
        </div>
        <div className="relative mx-[calc(50%-20px)] mt-4 h-[2px] bg-muted">
          <div className="h-[2px] bg-red-400" style={{ width: "100%" }} />
        </div>
      </div>
    )
  }

  const currentIndex = ORDER_STATUS_FLOW.findIndex((s) => s === normalized)
  if (currentIndex === -1) return null

  return (
    <div className="py-6">
      <div className="flex items-start justify-between">
        {ORDER_STATUS_FLOW.map((step, i) => {
          const done = i <= currentIndex
          const isCurrent = i === currentIndex
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                done
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}>
                {done ? "✓" : i + 1}
              </div>
              <p className={`mt-2 text-[10px] font-semibold uppercase tracking-wider text-center leading-tight ${
                done ? "text-foreground" : "text-muted-foreground/60"
              }`}>
                {ORDER_STATUS_LABELS[step]}
              </p>
            </div>
          )
        })}
      </div>
      <div className="relative -mt-8 mx-[12px]">
        <div className="h-[2px] bg-muted" />
        <div
          className="h-[2px] bg-primary transition-all duration-700"
          style={{ width: `${(currentIndex / (ORDER_STATUS_FLOW.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
