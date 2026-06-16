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

type PaymentMethod = {
  id: string
  provider: string
  displayName: string
  enabled: boolean
  mode: string
  supportsFullPayment: boolean
  supportsPartialPayment: boolean
  supportsCodDeliveryCharge: boolean
  instructions: string
  credentials: Record<string, string>
}

const PROVIDER_LABELS: Record<string, string> = {
  COD: "Cash on Delivery",
}

const PROVIDER_CREDENTIAL_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  COD: [],
}

const PROVIDERS = ["COD"]

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [savedCredentialKeys, setSavedCredentialKeys] = useState<Record<string, string[]>>({})

  function getDefaultMethod(provider: string): PaymentMethod {
    return {
      id: "", provider,
      displayName: PROVIDER_LABELS[provider] || provider,
      enabled: true,
      mode: "SANDBOX",
      supportsFullPayment: true,
      supportsPartialPayment: false,
      supportsCodDeliveryCharge: false,
      instructions: "Pay when you receive your order.",
      credentials: {},
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/payment-methods")
      const d = await res.json()
      if (d.success) {
        const serverMethods = d.data as PaymentMethod[]
        const merged = PROVIDERS.map((provider) => {
          const server = serverMethods.find((m: PaymentMethod) => m.provider === provider)
          return server ?? getDefaultMethod(provider)
        })

        const savedMap: Record<string, string[]> = {}
        for (const sm of serverMethods) {
          const keys: string[] = []
          for (const [k, v] of Object.entries(sm.credentials)) {
            if (v && v.startsWith("********")) {
              keys.push(k)
            }
          }
          savedMap[sm.provider] = keys
        }
        setSavedCredentialKeys(savedMap)

        setMethods(merged.map((m) => {
          const savedKeys = savedMap[m.provider]
          if (!savedKeys || savedKeys.length === 0) return m
          const clean = { ...m.credentials }
          for (const key of savedKeys) {
            clean[key] = ""
          }
          return { ...m, credentials: clean }
        }))
      } else {
        toast.error("Failed to load payment methods")
      }
    } catch {
      toast.error("Failed to load payment methods")
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
      const safeCredentials: Record<string, string> = {}
      for (const [k, v] of Object.entries(method.credentials)) {
        if (v && !v.startsWith("********")) {
          safeCredentials[k] = v
        }
      }
      const res = await fetch("/api/admin/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: method.provider,
          displayName: method.displayName,
          enabled: method.enabled,
          instructions: method.instructions,
          credentials: {},
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(`${PROVIDER_LABELS[provider]} settings saved`)
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
        <AdminPageHeader eyebrow="Operations" title="Payment Methods" description="Configure payment gateways. Credentials are encrypted." />
        <p className="text-sm text-slate-400 py-8">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Operations" title="Payment Methods" description="Configure payment gateways. Credentials are encrypted." backHref="/admin/operations" />

      <div className="grid gap-3">
        {methods.map((method) => {
          const isExpanded = expanded === method.provider
          const fields = PROVIDER_CREDENTIAL_FIELDS[method.provider] || []

          return (
            <Card key={method.provider} className="overflow-hidden rounded-xl border-slate-200/60 bg-white shadow-sm">
              <CardHeader className="cursor-pointer select-none hover:bg-slate-50/80 transition-colors py-3 px-4" onClick={() => setExpanded(isExpanded ? null : method.provider)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        {method.displayName}
                        <AdminStatusBadge status={method.enabled ? "Active" : "Disabled"} />
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
                  <div className="space-y-1.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Display Name</Label>
                      <Input value={method.displayName} onChange={(e) => updateMethod(method.provider, "displayName", e.target.value)} className="text-xs h-9" />
                    </div>
                  </div>

                  {fields.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-slate-600">Credentials</Label>
                        <p className="text-[10px] text-slate-400">Credentials are encrypted. Enter new text to replace saved values.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map((field) => {
                          const hasSaved = savedCredentialKeys[method.provider]?.includes(field.key)
                          return (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{field.label}</Label>
                              <Input type={field.type || "text"} value={method.credentials[field.key] || ""} onChange={(e) => updateCredential(method.provider, field.key, e.target.value)} placeholder={hasSaved ? "Saved credential exists. Enter new value to replace." : ""} className="text-xs h-9" />
                            </div>
                          )
                        })}
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
                      {saving === method.provider ? "Saving..." : `Save ${PROVIDER_LABELS[method.provider]}`}
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