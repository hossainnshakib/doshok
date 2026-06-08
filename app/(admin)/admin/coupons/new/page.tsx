"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { AdminPageHeader } from "@/components/admin/admin-ui"

export default function NewCouponPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState("")
  const [type, setType] = useState("flat")
  const [minOrder, setMinOrder] = useState("0")
  const [maxUses, setMaxUses] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discount: Number(discount),
        type,
        minOrder: Number(minOrder),
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresAt: expiresAt || undefined,
        active,
      }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success("Coupon created")
      router.push("/admin/coupons")
    } else {
      toast.error(d.error ?? "Failed")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader eyebrow="Commerce" title="New Coupon" description="Create a campaign-ready coupon for offers, launches, and limited-time promotions." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="rounded-[1.5rem] border-black/5 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount value</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="e.g. 20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Discount type</Label>
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
                <Label htmlFor="minOrder">Minimum order (৳)</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Maximum uses <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="e.g. 100"
                  />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry date <span className="text-muted-foreground">(optional)</span></Label>
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
          <Button type="submit" disabled={loading} className="h-11 rounded-full px-8">
            {loading ? "Creating..." : "Create Coupon"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 rounded-full px-6">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
