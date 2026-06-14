"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Save } from "lucide-react"
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-ui"
import { COURIER_LABELS, COURIER_CREDENTIAL_FIELDS, type CourierProvider } from "@/types"

type CourierMethod = {
  id: string; provider: string; displayName: string; enabled: boolean; mode: string; isDefault: boolean
  instructions: string; pickupName: string; pickupPhone: string; pickupAddress: string
  pickupCity: string; pickupZone: string; credentials: Record<string, string>
}

const COURIER_PROVIDERS: CourierProvider[] = ["PATHAO", "STEADFAST", "REDX"]

export default function AdminCourierMethodsPage() {
  const [methods, setMethods] = useState<CourierMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  function getDefaultMethod(provider: string): CourierMethod {
    return {
      id: "", provider, displayName: COURIER_LABELS[provider as CourierProvider] || provider,
      enabled: false, mode: "SANDBOX", isDefault: provider === "PATHAO", instructions: "",
      pickupName: "", pickupPhone: "", pickupAddress: "", pickupCity: "", pickupZone: "", credentials: {},
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/courier-methods")
      const d = await res.json()
      if (d.success) {
        const serverMethods = d.data as CourierMethod[]
        const merged = COURIER_PROVIDERS.map((provider) => {
          const server = serverMethods.find((m: CourierMethod) => m.provider === provider)
          return server ?? getDefaultMethod(provider)
        })
        setMethods(merged)
      } else {
        toast.error("Failed to load courier methods")
      }
    } catch {
      toast.error("Failed to load courier methods")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function updateMethod(provider: string, field: string, value: unknown) {
    setMethods((prev) => prev.map((m) => (m.provider === provider ? { ...m, [field]: value } : m)))
  }

  function updateCredential(provider: string, key: string, value: string) {
    setMethods((prev) => prev.map((m) => m.provider === provider ? { ...m, credentials: { ...m.credentials, [key]: value } } : m))
  }

  async function handleSave(provider: string) {
    const method = methods.find((m) => m.provider === provider)
    if (!method) return
    setSaving(provider)
    try {
      const res = await fetch("/api/admin/courier-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: method.provider, displayName: method.displayName, enabled: method.enabled, mode: method.mode,
          isDefault: method.isDefault, instructions: method.instructions, pickupName: method.pickupName,
          pickupPhone: method.pickupPhone, pickupAddress: method.pickupAddress, pickupCity: method.pickupCity,
          pickupZone: method.pickupZone, credentials: method.credentials,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`${COURIER_LABELS[provider as CourierProvider]} settings saved`)
        load()
      } else {
        toast.error(d.error ?? "Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Operations" title="Courier Methods" description="Configure courier integrations." />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-50 animate-pulse border border-slate-200/60" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Operations" title="Courier Methods" description="Configure Pathao, Steadfast, and RedX. Credentials are encrypted." backHref="/admin/operations" />

      <div className="grid gap-3">
        {methods.map((method) => {
          const isExpanded = expanded === method.provider
          const fields = COURIER_CREDENTIAL_FIELDS[method.provider as CourierProvider] || []

          const hasCredentials = Object.values(method.credentials).some(v => v && v.length > 0)
          const isConfigured = method.id !== "" && hasCredentials

          return (
            <Card key={method.provider} className="overflow-hidden rounded-xl border-slate-200/60 bg-white shadow-sm">
              <CardHeader className="cursor-pointer select-none hover:bg-slate-50/80 transition-colors py-3 px-4" onClick={() => setExpanded(isExpanded ? null : method.provider)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        {method.displayName}
                        <AdminStatusBadge status={method.enabled ? "Active" : "Disabled"} />
                        <AdminStatusBadge status={method.mode} />
                        <AdminStatusBadge status={isConfigured ? "Configured" : "Not Configured"} />
                        {method.isDefault && <AdminStatusBadge status="Default" />}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={method.enabled} onCheckedChange={(checked) => { updateMethod(method.provider, "enabled", checked) }} onClick={(e) => e.stopPropagation()} />
                    {isExpanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t border-slate-100 pt-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Display Name</Label>
                      <Input value={method.displayName} onChange={(e) => updateMethod(method.provider, "displayName", e.target.value)} className="text-xs h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Mode</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant={method.mode === "SANDBOX" ? "default" : "outline"} size="sm" onClick={() => updateMethod(method.provider, "mode", "SANDBOX")} className="flex-1 h-9 rounded-lg text-xs font-semibold">Sandbox</Button>
                        <Button type="button" variant={method.mode === "LIVE" ? "default" : "outline"} size="sm" onClick={() => updateMethod(method.provider, "mode", "LIVE")} className="flex-1 h-9 rounded-lg text-xs font-semibold">Live</Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch checked={method.isDefault} onCheckedChange={(checked) => { if (checked) setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.provider === method.provider }))) }} />
                    <Label className="text-xs font-medium text-slate-700 cursor-pointer">Set as default courier</Label>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-600">Pickup Information</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { field: "pickupName" as const, label: "Pickup Name" },
                        { field: "pickupPhone" as const, label: "Pickup Phone" },
                        { field: "pickupAddress" as const, label: "Pickup Address" },
                        { field: "pickupCity" as const, label: "Pickup City" },
                        { field: "pickupZone" as const, label: "Pickup Zone" },
                      ].map(({ field: fieldKey, label }) => {
                        const val = (method as unknown as Record<string, unknown>)[fieldKey]
                        return (
                          <div key={fieldKey} className="space-y-1">
                            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</Label>
                            <Input value={String(val ?? "")} onChange={(e) => updateMethod(method.provider, fieldKey, e.target.value)} className="text-xs h-9" />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {fields.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">API Credentials</Label>
                        <p className="text-[10px] text-slate-400">Credentials are encrypted. Enter new text to replace saved values.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map((field) => (
                          <div key={field.key} className="space-y-1">
                            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{field.label}</Label>
                            <Input type={field.type || "text"} value={method.credentials[field.key] || ""} onChange={(e) => updateCredential(method.provider, field.key, e.target.value)} placeholder={field.type === "password" ? "Enter new value to replace" : ""} className="text-xs h-9" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Instructions (shown to customers)</Label>
                    <Textarea value={method.instructions} onChange={(e) => updateMethod(method.provider, "instructions", e.target.value)} rows={2} className="text-xs" />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave(method.provider)} disabled={saving === method.provider} className="h-9 rounded-lg text-xs font-semibold">
                      <Save className="size-3.5 mr-1.5" />
                      {saving === method.provider ? "Saving..." : `Save ${COURIER_LABELS[method.provider as CourierProvider]}`}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}