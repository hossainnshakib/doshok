"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui"
import { Info } from "lucide-react"

type CheckoutSettings = {
  checkoutV2Enabled: boolean
  otpRequired: boolean
  otpTtlSeconds: number
  otpCooldownSeconds: number
  otpMaxResend: number
  checkoutTokenTtlSeconds: number
  defaultPaymentRule: string
  defaultPaymentRuleValue: number | null
  onlineReservationHours: number
  codReservationHours: number
}

export default function CheckoutSettingsPage() {
  const [settings, setSettings] = useState<CheckoutSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/checkout-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSettings(d.data as CheckoutSettings)
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false))
  }, [])

  function update<K extends keyof CheckoutSettings>(field: K, value: CheckoutSettings[K]) {
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/checkout-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const d = await res.json()
      if (d.success) toast.success("Checkout settings saved")
      else toast.error(d.error ?? "Failed to save")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400 py-8">Loading settings...</p>
  if (!settings) return <p className="text-sm text-red-500 py-8">Failed to load settings.</p>

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Settings"
        title="Checkout Settings"
        description="Configure Checkout V2 behavior, OTP requirements, and COD reservation settings."
        backHref="/admin/settings"
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <AdminSectionCard title="Checkout V2" description="Enable the new checkout flow with OTP verification and reservation-based ordering.">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium text-slate-700">Enable Checkout V2</Label>
                  <p className="text-[10px] text-slate-400">When enabled, the new checkout flow with OTP and reservations is active.</p>
                </div>
                <Switch
                  checked={settings.checkoutV2Enabled}
                  onCheckedChange={(v) => update("checkoutV2Enabled", v)}
                />
              </div>
              {settings.checkoutV2Enabled && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Require Phone OTP</Label>
                    <p className="text-[10px] text-slate-400">Customers must verify their phone via OTP before placing an order.</p>
                  </div>
                  <Switch
                    checked={settings.otpRequired}
                    onCheckedChange={(v) => update("otpRequired", v)}
                  />
                </div>
              )}
            </div>
          </AdminSectionCard>

          {settings.checkoutV2Enabled && (
            <>
              <AdminSectionCard title="OTP Configuration" description="Tune OTP expiry, resend cooldown, and token lifetimes.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="otpTtlSeconds" className="text-xs font-medium text-slate-600">
                      OTP Expiry (seconds)
                      <span className="ml-1 text-slate-400 font-normal">30–3600</span>
                    </Label>
                    <Input
                      id="otpTtlSeconds"
                      type="number"
                      value={settings.otpTtlSeconds}
                      onChange={(e) => update("otpTtlSeconds", parseInt(e.target.value) || 300)}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-slate-400">How long a sent OTP remains valid (default: 300).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="otpCooldownSeconds" className="text-xs font-medium text-slate-600">
                      Resend Cooldown (seconds)
                      <span className="ml-1 text-slate-400 font-normal">5–300</span>
                    </Label>
                    <Input
                      id="otpCooldownSeconds"
                      type="number"
                      value={settings.otpCooldownSeconds}
                      onChange={(e) => update("otpCooldownSeconds", parseInt(e.target.value) || 30)}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-slate-400">Minimum wait before the customer can request a new OTP (default: 30).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="otpMaxResend" className="text-xs font-medium text-slate-600">
                      Max Resends
                      <span className="ml-1 text-slate-400 font-normal">1–50</span>
                    </Label>
                    <Input
                      id="otpMaxResend"
                      type="number"
                      value={settings.otpMaxResend}
                      onChange={(e) => update("otpMaxResend", parseInt(e.target.value) || 5)}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-slate-400">Max times a customer can resend OTP (default: 5).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="checkoutTokenTtlSeconds" className="text-xs font-medium text-slate-600">
                      Verification Token TTL (seconds)
                      <span className="ml-1 text-slate-400 font-normal">60–7200</span>
                    </Label>
                    <Input
                      id="checkoutTokenTtlSeconds"
                      type="number"
                      value={settings.checkoutTokenTtlSeconds}
                      onChange={(e) => update("checkoutTokenTtlSeconds", parseInt(e.target.value) || 900)}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-slate-400">How long the checkout token is valid after OTP verification (default: 900).</p>
                  </div>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Reservation Hours" description="How long an order reserves stock before being released if unpaid.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-400">
                      Online Payment Reservation
                    </Label>
                    <Input
                      type="number"
                      value={settings.onlineReservationHours}
                      disabled
                      className="text-xs h-9 bg-slate-50 text-slate-400"
                    />
                    <p className="text-[10px] text-slate-400">Paused while Doshok V1.1 is COD-only.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="codReservationHours" className="text-xs font-medium text-slate-600">
                      COD Reservation (hours)
                      <span className="ml-1 text-slate-400 font-normal">1–720</span>
                    </Label>
                    <Input
                      id="codReservationHours"
                      type="number"
                      value={settings.codReservationHours}
                      onChange={(e) => update("codReservationHours", parseInt(e.target.value) || 24)}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-slate-400">Stock hold time for COD orders (default: 24).</p>
                  </div>
                </div>
              </AdminSectionCard>
            </>
          )}

          <AdminSectionCard title="Payment Rules" description="Online payment and advance collection rules are paused for the COD-only V1.1 release.">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="font-semibold">Cash on Delivery Only</p>
                  <p className="mt-1 leading-5">
                    Checkout will collect no advance payment. Pay Now is forced to 0 and the full total remains due on delivery until online gateways are rebuilt.
                  </p>
                </div>
              </div>
            </div>
          </AdminSectionCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Current</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Checkout V2</span>
                <span className={`font-semibold ${settings.checkoutV2Enabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {settings.checkoutV2Enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              {settings.checkoutV2Enabled && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">OTP Required</span>
                    <span className={`font-semibold ${settings.otpRequired ? "text-emerald-600" : "text-slate-400"}`}>
                      {settings.otpRequired ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">OTP Expiry</span>
                    <span className="font-mono text-slate-600">{settings.otpTtlSeconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cooldown</span>
                    <span className="font-mono text-slate-600">{settings.otpCooldownSeconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Resends</span>
                    <span className="tabular-nums text-slate-600">{settings.otpMaxResend}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Token TTL</span>
                    <span className="font-mono text-slate-600">{settings.checkoutTokenTtlSeconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Online Reservation</span>
                    <span className="text-slate-400">Paused</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">COD Reservation</span>
                    <span className="tabular-nums text-slate-600">{settings.codReservationHours}h</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Rule</span>
                <span className="text-right max-w-[120px] truncate text-slate-600">COD Only</span>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-9 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
