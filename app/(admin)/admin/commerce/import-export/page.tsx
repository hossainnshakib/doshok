"use client"

import { useState, useRef } from "react"

interface ImportSummary {
  totalRows: number
  validRows: number
  invalidRows: number
}

interface InvalidRow {
  row: number
  errors: string[]
}

interface ImportResult {
  mode?: "preview" | "execute"
  validRows: Record<string, string | number>[]
  invalidRows: InvalidRow[]
  summary: ImportSummary
  execution?: {
    created: number
    updated: number
    variantsCreated: number
    variantsUpdated: number
    skipped: number
    errors: string[]
  }
}

export default function ImportExportPage() {
  const [csvText, setCsvText] = useState("")
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport(endpoint: string, filename: string) {
    setExporting(endpoint)
    setError(null)
    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setExporting(null)
    }
  }

  async function handlePreview() {
    if (!csvText.trim()) {
      setError("Please paste CSV content or upload a file.")
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/admin/import/products", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error ?? "Preview failed")
      }
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleExecute() {
    if (!csvText.trim()) {
      setError("Please paste CSV content or upload a file.")
      return
    }
    if (!result || result.summary.invalidRows > 0 || result.summary.validRows === 0) {
      setError("Validate a clean CSV preview before executing import.")
      return
    }

    setExecuting(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/import/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, mode: "execute" }),
      })
      const json = await res.json()
      if (!json.success) {
        if (json.data) setResult(json.data)
        throw new Error(json.error ?? "Import execution failed")
      }
      setResult(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import execution failed")
    } finally {
      setExecuting(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      setResult(null)
      setError(null)
    }
    reader.readAsText(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ""
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import / Export</h1>
        <p className="mt-1 text-sm text-slate-500">
          Export products, orders, and customers. Preview product imports before creating them.
        </p>
      </div>

      {/* Export Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Export Data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Download CSV files of your store data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() =>
              handleExport(
                "/api/admin/export/products",
                `products-export-${Date.now()}.csv`
              )
            }
            disabled={exporting !== null}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {exporting === "/api/admin/export/products"
              ? "Exporting..."
              : "Export Products"}
          </button>
          <button
            onClick={() =>
              handleExport(
                "/api/admin/export/orders",
                `orders-export-${Date.now()}.csv`
              )
            }
            disabled={exporting !== null}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {exporting === "/api/admin/export/orders"
              ? "Exporting..."
              : "Export Orders"}
          </button>
          <button
            onClick={() =>
              handleExport(
                "/api/admin/export/customers",
                `customers-export-${Date.now()}.csv`
              )
            }
            disabled={exporting !== null}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {exporting === "/api/admin/export/customers"
              ? "Exporting..."
              : "Export Customers"}
          </button>
        </div>
      </section>

      {/* Import Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Import Products (Preview)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Paste CSV content below or upload a file. Required columns:{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">
            name
          </code>
          ,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">
            slug
          </code>
          ,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">
            price
          </code>
          ,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">
            categorySlug
          </code>
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value)
              setResult(null)
              setError(null)
            }}
            placeholder={`name,slug,price,categorySlug,status\nExample Product,example-product,1999,clothing,Active`}
            rows={8}
            className="w-full rounded-lg border border-slate-200 p-3 text-sm font-mono outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={loading || executing || !csvText.trim()}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Validating..." : "Validate Preview"}
            </button>
            <button
              onClick={handleExecute}
              disabled={
                loading ||
                executing ||
                !result ||
                result.summary.invalidRows > 0 ||
                result.summary.validRows === 0
              }
              className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {executing ? "Executing..." : "Execute Import"}
            </button>
            {result?.mode !== "execute" && (
              <span className="text-xs text-amber-600 font-medium">
                Execution will create/update products by slug. Existing reserved stock will not be changed.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <section className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Validation Summary
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {result.summary.totalRows}
                </p>
                <p className="text-xs text-slate-500">Total Rows</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {result.summary.validRows}
                </p>
                <p className="text-xs text-green-600">Valid Rows</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {result.summary.invalidRows}
                </p>
                <p className="text-xs text-red-600">Invalid Rows</p>
              </div>
            </div>
          </div>

          {/* Execution Result */}
          {result.execution && (
            <div className="rounded-xl border border-amber-200 bg-white p-6">
              <h3 className="text-base font-semibold text-amber-800">
                Execution Result
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-5">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{result.execution.created}</p>
                  <p className="text-xs text-slate-500">Created</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{result.execution.updated}</p>
                  <p className="text-xs text-slate-500">Updated</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.execution.variantsCreated}</p>
                  <p className="text-xs text-green-600">Variants Created</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.execution.variantsUpdated}</p>
                  <p className="text-xs text-green-600">Variants Updated</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{result.execution.skipped}</p>
                  <p className="text-xs text-slate-500">Skipped</p>
                </div>
              </div>
              {result.execution.errors.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-red-600">
                  {result.execution.errors.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Invalid Rows Table */}
          {result.invalidRows.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white p-6">
              <h3 className="text-base font-semibold text-red-800">
                Invalid Rows ({result.invalidRows.length})
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <th className="pb-2 pr-4">Row</th>
                      <th className="pb-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.invalidRows.map((r) => (
                      <tr key={r.row}>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-500 align-top">
                          {r.row}
                        </td>
                        <td className="py-2">
                          <ul className="list-disc pl-4 space-y-0.5">
                            {r.errors.map((e, i) => (
                              <li key={i} className="text-xs text-red-600">
                                {e}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Rows Preview */}
          {result.validRows.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-white p-6">
              <h3 className="text-base font-semibold text-green-800">
                Valid Rows ({result.validRows.length})
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <th className="pb-2 pr-4">Row</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Slug</th>
                      <th className="pb-2 pr-4">Action</th>
                      <th className="pb-2 pr-4">Price</th>
                      <th className="pb-2">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.validRows.slice(0, 50).map((r) => (
                      <tr key={r.row}>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-500">
                          {r.row}
                        </td>
                        <td className="py-2 pr-4 text-slate-900">
                          {r.name}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-600">
                          {r.slug}
                        </td>
                        <td className="py-2 pr-4 text-xs font-semibold uppercase text-slate-500">
                          {r.action}
                        </td>
                        <td className="py-2 pr-4 text-slate-900">
                          {r.price}
                        </td>
                        <td className="py-2 text-slate-600">
                          {r.categorySlug}
                        </td>
                      </tr>
                    ))}
                    {result.validRows.length > 50 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-3 text-center text-xs text-slate-400"
                        >
                          + {result.validRows.length - 50} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
