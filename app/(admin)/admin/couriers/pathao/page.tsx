"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Save, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { AdminPageHeader, AdminBackLink } from "@/components/admin/admin-ui"

type PathaoSettings = {
  code: string
  name: string
  environment: "sandbox" | "live"
  isActive: boolean
  credentials: {
    hasClientId: boolean
    hasClientSecret: boolean
    hasUsername: boolean
    hasPassword: boolean
    hasDefaultStoreId: boolean
  } | null
  tokenStatus: {
    valid: boolean
    expiresAt?: string
  } | null
}

type Store = {
  storeId: string
  name: string | null
  merchantName: string | null
  isActive: boolean
}

export default function AdminPathaoSettingsPage() {
  const [settings, setSettings] = useState<PathaoSettings | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [defaultStoreId, setDefaultStoreId] = useState("")
  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox")
  const [isActive, setIsActive] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [settingsRes, storesRes] = await Promise.all([
        fetch("/api/admin/courier/pathao/settings"),
        fetch("/api/admin/courier/pathao/stores"),
      ])
      const [settingsData, storesData] = await Promise.all([
        settingsRes.json(),
        storesRes.json(),
      ])
      if (settingsData.success) {
        const s = settingsData.data as PathaoSettings
        setSettings(s)
        setEnvironment(s.environment)
        setIsActive(s.isActive)
        setHasCredentials(s.credentials !== null && Object.values(s.credentials).some(v => v))
      }
      if (storesData.success) {
        setStores(storesData.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/courier/pathao/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment,
          isActive,
          credentials: {
            clientId,
            clientSecret,
            username,
            password,
            defaultStoreId,
          },
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(d.data?.message || "Settings saved")
        load()
        setClientId("")
        setClientSecret("")
        setUsername("")
        setPassword("")
      } else {
        toast.error(d.error || "Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    try {
      const res = await fetch("/api/admin/courier/pathao/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_connection" }),
      })
      let d
      try {
        d = await res.json()
      } catch {
        toast.error(`Server error: ${res.status} ${res.statusText}`)
        setTesting(false)
        return
      }
      if (d.success) {
        toast.success(d.data?.message || "Connection successful")
        load()
      } else {
        toast.error(d.error || `Connection failed (${res.status})`)
      }
    } catch (err) {
      toast.error(`Network error: ${err instanceof Error ? err.message : "Failed to connect"}`)
    }
    setTesting(false)
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Operations" title="Pathao Settings" description="Configure Pathao courier integration." backHref="/admin/couriers" />
        <p className="text-sm text-slate-400 py-8">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title="Pathao Settings"
        description="Configure Pathao courier integration credentials and environment."
        backHref="/admin/couriers"
      />
      <AdminBackLink href="/admin/couriers" label="Back to Couriers" />

      {settings?.tokenStatus && (
        <Card className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Token Status</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              {settings.tokenStatus.valid ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs font-medium">
                {settings.tokenStatus.valid ? "Token is valid" : "Token is expired or invalid"}
              </span>
            </div>
            {settings.tokenStatus.expiresAt && (
              <p className="text-[10px] text-slate-400">
                Expires: {new Date(settings.tokenStatus.expiresAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Configuration</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-normal text-slate-500">Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Environment</Label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as "sandbox" | "live")}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Default Store</Label>
              {stores.length > 0 ? (
                <Select value={defaultStoreId} onValueChange={(v) => { if (v) setDefaultStoreId(v) }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select default store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.storeId} value={store.storeId}>
                        {store.name || store.storeId}
                        {store.merchantName ? ` (${store.merchantName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-slate-400 italic pt-1.5">
                  No stores synced yet. Save credentials and sync stores first.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Credentials</Label>
              <p className="text-[10px] text-slate-400">Credentials are encrypted. Enter new values to replace saved ones.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Client ID</Label>
                <Input
                  type="password"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder={hasCredentials ? "Saved credential exists" : ""}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Client Secret</Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={hasCredentials ? "Saved credential exists" : ""}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={hasCredentials ? "Saved credential exists" : ""}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={hasCredentials ? "Saved credential exists" : ""}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="h-9 rounded-lg px-4 text-xs font-semibold">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            <Button onClick={handleTestConnection} disabled={testing} variant="outline" className="h-9 rounded-lg px-4 text-xs font-semibold">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
