import { AdminPageHeader } from "@/components/admin/admin-ui"

export default function InventoryLowStockPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Low Stock Alerts"
        description="Products and variants that are running low on stock and need restocking attention."
      />
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Low stock alerts module coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Products below the stock threshold will be flagged here for restocking.
        </p>
      </div>
    </div>
  )
}