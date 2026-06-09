const ORDER_STEPS = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"] as const

export function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = ORDER_STEPS.findIndex(
    (s) => s.toLowerCase() === currentStatus.toLowerCase()
  )

  if (currentIndex === -1) return null

  return (
    <div className="py-6">
      <div className="flex items-start justify-between">
        {ORDER_STEPS.map((step, i) => {
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
                {step}
              </p>
            </div>
          )
        })}
      </div>
      <div className="relative -mt-8 mx-[12px]">
        <div className="h-[2px] bg-muted" />
        <div
          className="h-[2px] bg-primary transition-all duration-700"
          style={{ width: `${(currentIndex / (ORDER_STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
