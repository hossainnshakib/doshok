"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronUp,
  Save,
  Wallet,
  CreditCard,
  Building2,
  Smartphone,
  Landmark,
  Banknote,
  Truck,
} from "lucide-react"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "@/components/admin/admin-ui"

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

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  BKASH: <Smartphone className="size-5" />,
  NAGAD: <Smartphone className="size-5" />,
  ROCKET: <Smartphone className="size-5" />,
  UPAY: <Smartphone className="size-5" />,
  SSLCOMMERZ: <Building2 className="size-5" />,
  AAMARPAY: <CreditCard className="size-5" />,
  COD: <Truck className="size-5" />,
}

const PROVIDER_LABELS: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  UPAY: "Upay",
  SSLCOMMERZ: "SSLCommerz",
  AAMARPAY: "aamarPay",
  COD: "Cash on Delivery",
}

const PROVIDER_CREDENTIAL_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  BKASH: [
    { key: "merchantNumber", label: "Merchant Number" },
    { key: "appKey", label: "App Key" },
    { key: "appSecret", label: "App Secret", type: "password" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "callbackUrl", label: "Callback URL" },
  ],
  NAGAD: [
    { key: "merchantId", label: "Merchant ID" },
    { key: "merchantNumber", label: "Merchant Number" },
    { key: "publicKey", label: "Public Key" },
    { key: "privateKey", label: "Private Key", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "callbackUrl", label: "Callback URL" },
  ],
  ROCKET: [
    { key: "merchantId", label: "Merchant ID" },
    { key: "merchantNumber", label: "Merchant Number" },
    { key: "secretKey", label: "Secret Key", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "callbackUrl", label: "Callback URL" },
  ],
  UPAY: [
    { key: "merchantId", label: "Merchant ID" },
    { key: "merchantNumber", label: "Merchant Number" },
    { key: "appKey", label: "App Key" },
    { key: "appSecret", label: "App Secret", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "callbackUrl", label: "Callback URL" },
  ],
  SSLCOMMERZ: [
    { key: "storeId", label: "Store ID" },
    { key: "storePassword", label: "Store Password", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "successUrl", label: "Success URL" },
    { key: "failUrl", label: "Fail URL" },
    { key: "cancelUrl", label: "Cancel URL" },
    { key: "ipnUrl", label: "IPN URL" },
  ],
  AAMARPAY: [
    { key: "storeId", label: "Store ID" },
    { key: "signatureKey", label: "Signature Key", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "successUrl", label: "Success URL" },
    { key: "failUrl", label: "Fail URL" },
    { key: "cancelUrl", label: "Cancel URL" },
  ],
  COD: [],
}

const PROVIDERS = ["BKASH", "NAGAD", "ROCKET", "UPAY", "SSLCOMMERZ", "AAMARPAY", "COD"]

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  function getDefaultMethod(provider: string): PaymentMethod {
    return {
      id: "",
      provider,
      displayName: PROVIDER_LABELS[provider] || provider,
      enabled: provider === "COD",
      mode: "SANDBOX",
      supportsFullPayment: provider === "COD",
      supportsPartialPayment: provider !== "COD",
      supportsCodDeliveryCharge: false,
      instructions: provider === "COD" ? "Pay when you receive your order." : "",
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
        setMethods(merged)
      } else {
        toast.error("Failed to load payment methods")
      }
    } catch {
      toast.error("Failed to load payment methods")
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
      const res = await fetch("/api/admin/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: method.provider,
          displayName: method.displayName,
          enabled: method.enabled,
          mode: method.mode,
          supportsFullPayment: method.supportsFullPayment,
          supportsPartialPayment: method.supportsPartialPayment,
          supportsCodDeliveryCharge: method.supportsCodDeliveryCharge,
          instructions: method.instructions,
          credentials: method.credentials,
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

  function toggleExpanded(provider: string) {
    setExpanded((prev) => (prev === provider ? null : provider))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Settings" title="Payment Methods" description="Loading setup-ready payment providers..." />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Settings" title="Payment Methods" description="Configure setup-ready providers. Secret fields remain password-masked in the UI." />

      <div className="grid gap-4">
        {methods.map((method) => {
          const isExpanded = expanded === method.provider
          const fields = PROVIDER_CREDENTIAL_FIELDS[method.provider] || []

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

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Supported Flows</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-checked:border-primary has-checked:bg-primary/5">
                        <Switch
                          checked={method.supportsFullPayment}
                          onCheckedChange={(checked) =>
                            updateMethod(method.provider, "supportsFullPayment", checked)
                          }
                        />
                        <div className="text-sm">
                          <span className="font-medium">Full Payment</span>
                          <p className="text-xs text-muted-foreground">Pay 100% online</p>
                        </div>
                      </Label>
                      <Label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-checked:border-primary has-checked:bg-primary/5">
                        <Switch
                          checked={method.supportsPartialPayment}
                          onCheckedChange={(checked) =>
                            updateMethod(method.provider, "supportsPartialPayment", checked)
                          }
                        />
                        <div className="text-sm">
                          <span className="font-medium">Partial Payment</span>
                          <p className="text-xs text-muted-foreground">Pay deposit online</p>
                        </div>
                      </Label>
                      <Label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-checked:border-primary has-checked:bg-primary/5">
                        <Switch
                          checked={method.supportsCodDeliveryCharge}
                          onCheckedChange={(checked) =>
                            updateMethod(method.provider, "supportsCodDeliveryCharge", checked)
                          }
                        />
                        <div className="text-sm">
                          <span className="font-medium">COD Delivery Charge</span>
                          <p className="text-xs text-muted-foreground">Prepay delivery fee</p>
                        </div>
                      </Label>
                    </div>
                  </div>

                  {fields.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Credentials</Label>
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
                              placeholder={field.type === "password" ? "••••••••" : ""}
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
