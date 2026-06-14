"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  Home,
  Briefcase,
  Users,
} from "lucide-react"
import type { UserAddress, AddressLabel } from "@/types"
import { ADDRESS_LABELS } from "@/types"
import { getPhoneDisplayE164, getPhoneInputValue, normalizePhoneToLocal } from "@/lib/utils"
import { getDivisions, getDistrictsByDivision, getUpazilasByDistrict } from "@/lib/bangladesh-address"
import type { Division, District, Upazila } from "@/lib/bangladesh-address"
import { AddressCombobox } from "@/components/store/address-combobox"

const LABEL_ICONS: Record<AddressLabel, typeof Home> = {
  Home,
  Office: Briefcase,
  Family: Users,
  Other: MapPin,
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold text-foreground">No saved addresses</p>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        You haven&apos;t added any delivery addresses yet. Save one now to breeze through checkout next time.
      </p>
    </div>
  )
}

type FormData = {
  label: AddressLabel
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  zone: string
  postalCode: string
  divisionId: string
  districtId: string
  upazilaId: string
  divisionName: string
  districtName: string
  upazilaName: string
  isDefault: boolean
}

const emptyForm: FormData = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  zone: "chatto",
  postalCode: "",
  divisionId: "",
  districtId: "",
  upazilaId: "",
  divisionName: "",
  districtName: "",
  upazilaName: "",
  isDefault: false,
}

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [districts, setDistricts] = useState<District[]>([])
  const [upazilas, setUpazilas] = useState<Upazila[]>([])
  const divisions = getDivisions()

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/account/addresses")
      const d = await res.json()
      if (d.success) setAddresses(d.data as UserAddress[])
    } catch {
      toast.error("Failed to load addresses")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setDistricts([])
    setUpazilas([])
    setErrors([])
    setDialogOpen(true)
  }

  function openEdit(addr: UserAddress) {
    setEditingId(addr.id)
    setForm({
      label: addr.label as AddressLabel,
      recipientName: addr.recipientName,
      phone: getPhoneInputValue(addr.phone),
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      city: addr.city,
      zone: addr.zone,
      postalCode: addr.postalCode || "",
      divisionId: addr.divisionId || "",
      districtId: addr.districtId || "",
      upazilaId: addr.upazilaId || "",
      divisionName: addr.divisionName || "",
      districtName: addr.districtName || "",
      upazilaName: addr.upazilaName || "",
      isDefault: addr.isDefault,
    })
    if (addr.divisionId) {
      setDistricts(getDistrictsByDivision(addr.divisionId))
    }
    if (addr.districtId) {
      setUpazilas(getUpazilasByDistrict(addr.districtId))
    }
    setErrors([])
    setDialogOpen(true)
  }

  function validate(): string[] {
    const errs: string[] = []
    if (!form.recipientName.trim()) errs.push("Recipient Name is required")
    if (!form.phone.trim()) errs.push("Phone is required")
    else if (!/^(\+?880)?01[3-9]\d{8}$/.test(form.phone.trim())) errs.push("Enter a valid Bangladeshi phone number.")
    if (!form.addressLine1.trim()) errs.push("Address is required")
    if (!form.city.trim()) errs.push("City is required")
    return errs
  }

  async function handleSave() {
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) return

    setSaving(true)
    try {
      const url = editingId
        ? `/api/account/addresses/${editingId}`
        : "/api/account/addresses"
      const method = editingId ? "PUT" : "POST"

      const payload = {
        ...form,
        phone: normalizePhoneToLocal(form.phone),
        divisionId: form.divisionId || null,
        districtId: form.districtId || null,
        upazilaId: form.upazilaId || null,
        divisionName: form.divisionName || null,
        districtName: form.districtName || null,
        upazilaName: form.upazilaName || null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (d.success) {
        toast.success(editingId ? "Address updated" : "Address added")
        setDialogOpen(false)
        fetchAddresses()
      } else {
        toast.error(d.error ?? "Failed to save address")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" })
      const d = await res.json()
      if (d.success) {
        toast.success("Address deleted")
        fetchAddresses()
      } else {
        toast.error(d.error ?? "Failed to delete")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSetDefault(id: string) {
    const addr = addresses.find((a) => a.id === id)
    if (!addr || addr.isDefault) return

    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: addr.label,
          recipientName: addr.recipientName,
          phone: addr.phone,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2 || "",
          city: addr.city,
          zone: addr.zone,
          postalCode: addr.postalCode || "",
          divisionId: addr.divisionId || null,
          districtId: addr.districtId || null,
          upazilaId: addr.upazilaId || null,
          divisionName: addr.divisionName || null,
          districtName: addr.districtName || null,
          upazilaName: addr.upazilaName || null,
          isDefault: true,
        }),
      })
      const d = await res.json()
      if (d.success) {
        toast.success("Default address updated")
        fetchAddresses()
      } else {
        toast.error(d.error ?? "Failed to set default")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
        Loading addresses...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">
            Account
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Addresses</h1>
        </div>
        {addresses.length > 0 && (
          <Button onClick={openAdd} className="gap-2 rounded-xl h-11">
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        )}
      </div>

      {addresses.length === 0 ? (
        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <EmptyState />
            <div className="px-6 pb-6 text-center">
              <Button onClick={openAdd} className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Add Address
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => {
            const Icon = LABEL_ICONS[addr.label as AddressLabel] || MapPin
            return (
              <Card
                key={addr.id}
                className={`border-border/50 rounded-2xl shadow-sm transition-all ${
                  addr.isDefault ? "ring-1 ring-primary/30" : ""
                }`}
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {addr.label}
                        {addr.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                            <Star className="h-3 w-3 fill-primary" /> Default
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Edit address"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      disabled={deletingId === addr.id}
                      className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      aria-label="Delete address"
                    >
                      {deletingId === addr.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-medium">{addr.recipientName}</p>
                  <p className="text-muted-foreground">{addr.addressLine1}</p>
                  {addr.addressLine2 && (
                    <p className="text-muted-foreground">{addr.addressLine2}</p>
                  )}
                  {(addr.divisionName || addr.districtName || addr.upazilaName) && (
                    <p className="text-muted-foreground">
                      {[addr.upazilaName, addr.districtName, addr.divisionName].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {addr.city}
                    {addr.postalCode ? ` - ${addr.postalCode}` : ""}
                  </p>
                  <p className="text-muted-foreground">{getPhoneDisplayE164(addr.phone)}</p>
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Set as default
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update your saved address." : "Save a new delivery address to your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <div className="flex gap-2">
                {ADDRESS_LABELS.map((l) => {
                  const Icon = LABEL_ICONS[l]
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setForm({ ...form, label: l })}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                        form.label === l
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {l}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name</Label>
                <Input
                  id="recipientName"
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  placeholder="John Doe"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="01XXXXXXXXX"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                placeholder="House #, Road #, Area"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2 (optional)</Label>
              <Input
                id="addressLine2"
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Apartment, suite, etc."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Division</Label>
                <AddressCombobox
                  options={divisions}
                  value={form.divisionId}
                  onChange={(v) => {
                    if (!v) return
                    const div = divisions.find((d) => d.id === v)
                    if (div) {
                      setForm({
                        ...form,
                        divisionId: div.id,
                        divisionName: div.name,
                        districtId: "",
                        districtName: "",
                        upazilaId: "",
                        upazilaName: "",
                        city: div.name,
                      })
                      setDistricts(getDistrictsByDivision(v))
                      setUpazilas([])
                    }
                  }}
                  placeholder="Select division"
                  className=""
                />
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <AddressCombobox
                  options={districts}
                  value={form.districtId}
                  onChange={(v) => {
                    if (!v) return
                    const dist = districts.find((d) => d.id === v)
                    if (dist) {
                      setForm({
                        ...form,
                        districtId: dist.id,
                        districtName: dist.name,
                        upazilaId: "",
                        upazilaName: "",
                        city: dist.name,
                      })
                      setUpazilas(getUpazilasByDistrict(v))
                    }
                  }}
                  placeholder={form.divisionId ? "Select district" : "Select division first"}
                  disabled={!form.divisionId}
                  className=""
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Upazila / Thana</Label>
                <AddressCombobox
                  options={upazilas}
                  value={form.upazilaId}
                  onChange={(v) => {
                    if (!v) return
                    const upa = upazilas.find((u) => u.id === v)
                    if (upa) {
                      setForm({
                        ...form,
                        upazilaId: upa.id,
                        upazilaName: upa.name,
                      })
                    }
                  }}
                  placeholder={form.districtId ? "Select upazila/thana" : "Select district first"}
                  disabled={!form.districtId}
                  className=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Chattogram"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zone">Delivery Zone</Label>
                  <Select
                  value={form.zone || undefined}
                  onValueChange={(v) => v && setForm({ ...form, zone: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatto">Inside Chattogram</SelectItem>
                    <SelectItem value="dhaka">Dhaka</SelectItem>
                    <SelectItem value="outside">Outside Dhaka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code (optional)</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="4000"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                <ul className="list-disc list-inside text-sm text-destructive/80 space-y-0.5">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  editingId ? "Update" : "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
