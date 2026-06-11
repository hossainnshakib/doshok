import { AdminPageHeader } from "@/components/admin/admin-ui"

export default function InventoryStockMovementsPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock Movements"
        description="Track all stock changes: manual adjustments, order deductions, cancellations, and returns."
      />
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Stock movements module coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          All stock changes will be logged here with reason, source, and timestamp.
        </p>
      </div>
    </div>
  )
}