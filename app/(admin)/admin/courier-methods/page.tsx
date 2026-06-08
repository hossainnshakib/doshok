"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronUp,
  Save,
  Package,
} from "lucide-react"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"
import { ALLOWED_COURIERS, COURIER_LABELS, COURIER_CREDENTIAL_FIELDS, type CourierProvider } from "@/types"

type CourierMethod = {
  id: string
  provider: string
  displayName: string
  enabled: boolean
  mode: string
  isDefault: boolean
  instructions: string
  pickupName: string
  pickupPhone: string
  pickupAddress: string
  pickupCity: string
  pickupZone: string
  credentials: Record<string, string>
}

const COURIER_PROVIDERS: CourierProvider[] = ["PATHAO", "STEADFAST", "REDX"]

export default function AdminCourierMethodsPage() {
  const [methods, setMethods] = useState<CourierMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  function getDefaultMethod(provider: string): CourierMethod {
    return {
      id: "",
      provider,
      displayName: COURIER_LABELS[provider as CourierProvider] || provider,
      enabled: false,
      mode: "SANDBOX",
      isDefault: provider === "PATHAO",
      instructions: "",
      pickupName: "",
      pickupPhone: "",
      pickupAddress: "",
      pickupCity: "",
      pickupZone: "",
      credentials: {},
    }
  }

  const PROVIDER_ICONS: Record<string, React.ReactNode> = {
    PATHAO: <Package className="size-5" />,
    STEADFAST: <Package className="size-5" />,
    REDX: <Package className="size-5" />,
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

  useEffect(() => {
    load()
  }, [])

  function updateMethod(provider: string, field: string, value: unknown) {
    setMethods((prev) =>
      prev.map((m) => (m.provider === provider ? { ...m, [field]: value } : m))
    )
  }

  function updateCredential(provider: string, key: string, value: string) {
    setMethods((prev) =>
      prev.map((m) =>
        m.provider === provider
          ? { ...m, credentials: { ...m.credentials, [key]: value } }
          : m
      )
    )
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
          provider: method.provider,
          displayName: method.displayName,
          enabled: method.enabled,
          mode: method.mode,
          isDefault: method.isDefault,
          instructions: method.instructions,
          pickupName: method.pickupName,
          pickupPhone: method.pickupPhone,
          pickupAddress: method.pickupAddress,
          pickupCity: method.pickupCity,
          pickupZone: method.pickupZone,
          credentials: method.credentials,
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

  function toggleExpanded(provider: string) {
    setExpanded((prev) => (prev === provider ? null : provider))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Settings" title="Courier Methods" description="Loading setup-ready courier providers..." />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Settings" title="Courier Methods" description="Configure Pathao, Steadfast, and RedX. Credentials are encrypted. Live courier API integration is setup-ready." />

      <div className="grid gap-4">
        {methods.map((method) => {
          const isExpanded = expanded === method.provider
          const fields = COURIER_CREDENTIAL_FIELDS[method.provider as CourierProvider] || []

          return (
            <Card key={method.provider} className="overflow-hidden rounded-[1.5rem] border-black/5 bg-white shadow-sm">
              <CardHeader
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpanded(method.provider)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                      {PROVIDER_ICONS[method.provider]}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {method.displayName}
                        <AdminStatusBadge status={method.enabled ? "Active" : "Disabled"} />
                        <AdminStatusBadge status={method.mode} />
                        {method.isDefault && (
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={method.enabled}
                      onCheckedChange={(checked) => {
                        updateMethod(method.provider, "enabled", checked)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={method.displayName}
                        onChange={(e) => updateMethod(method.provider, "displayName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={method.mode === "SANDBOX" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateMethod(method.provider, "mode", "SANDBOX")}
                          className="flex-1"
                        >
                          Sandbox
                        </Button>
                        <Button
                          type="button"
                          variant={method.mode === "LIVE" ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateMethod(method.provider, "mode", "LIVE")}
                          className="flex-1"
                        >
                          Live
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={method.isDefault}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setMethods((prev) =>
                            prev.map((m) => ({
                              ...m,
                              isDefault: m.provider === method.provider,
                            }))
                          )
                        }
                      }}
                    />
                    <Label className="text-sm font-medium cursor-pointer">Set as default courier</Label>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Pickup Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pickup Name</Label>
                        <Input
                          value={method.pickupName}
                          onChange={(e) => updateMethod(method.provider, "pickupName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pickup Phone</Label>
                        <Input
                          value={method.pickupPhone}
                          onChange={(e) => updateMethod(method.provider, "pickupPhone", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pickup Address</Label>
                        <Input
                          value={method.pickupAddress}
                          onChange={(e) => updateMethod(method.provider, "pickupAddress", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pickup City</Label>
                        <Input
                          value={method.pickupCity}
                          onChange={(e) => updateMethod(method.provider, "pickupCity", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Pickup Zone</Label>
                        <Input
                          value={method.pickupZone}
                          onChange={(e) => updateMethod(method.provider, "pickupZone", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {fields.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">API Credentials</Label>
                      <p className="text-xs text-muted-foreground">Credentials are encrypted at rest. Saved values appear masked — enter new text to replace them.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <Label className="text-xs">{field.label}</Label>
                            <Input
                              type={field.type || "text"}
                              value={method.credentials[field.key] || ""}
                              onChange={(e) =>
                                updateCredential(method.provider, field.key, e.target.value)
                              }
                              placeholder={field.type === "password" ? "Enter new value to replace saved credential" : ""}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Instructions (shown to customers)</Label>
                    <Textarea
                      value={method.instructions}
                      onChange={(e) => updateMethod(method.provider, "instructions", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSave(method.provider)}
                      disabled={saving === method.provider}
                    >
                      <Save className="size-4 mr-1.5" />
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
