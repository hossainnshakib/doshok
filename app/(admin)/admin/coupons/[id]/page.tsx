"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { AdminPageHeader } from "@/components/admin/admin-ui"

type Coupon = {
  id: string
  code: string
  discount: number
  type: string
  minOrder: number
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  active: boolean
}

export default function EditCouponPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState("")
  const [type, setType] = useState("flat")
  const [minOrder, setMinOrder] = useState("0")
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetch(`/api/coupons/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const c: Coupon = d.data
          setCode(c.code)
          setDiscount(String(c.discount))
          setType(c.type)
          setMinOrder(String(c.minOrder))
          setMaxUses(c.maxUses ? String(c.maxUses) : "")
          setExpiresAt(c.expiresAt ? c.expiresAt.split("T")[0] : "")
          setActive(c.active)
        }
      })
      .catch(() => toast.error("Failed to load coupon"))
      .finally(() => setLoadingData(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discount: Number(discount),
        type,
        minOrder: Number(minOrder),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
        active,
      }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success("Coupon updated")
      router.push("/admin/coupons")
    } else {
      toast.error(d.error ?? "Failed")
    }
    setLoading(false)
  }

  if (loadingData) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="Edit Coupon" description="Adjust campaign limits, expiry, and activation state." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="rounded-[1.5rem] border-black/5 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat (৳)</SelectItem>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minOrder">Min Order (৳)</Label>
                <Input
                  id="minOrder"
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active">Active</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="rounded-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
