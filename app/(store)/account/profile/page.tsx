"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { User, Loader2, BadgeCheck, AlertTriangle, Mail, Phone } from "lucide-react"
import { getPhoneInputValue } from "@/lib/utils"

type ProfileData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
}

export default function AccountProfilePage() {
  const { data: session, update } = useSession()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/account/profile")
        const d = await res.json()
        if (d.success) {
          const p = d.data as ProfileData
          setFirstName(p.firstName || "")
          setLastName(p.lastName || "")
          setPhone(getPhoneInputValue(p.phone || ""))
          setDateOfBirth(p.dateOfBirth || "")
          setGender(p.gender || "")
        }
      } catch {
        // silent
      } finally {
        setFetching(false)
      }
    }
    loadProfile()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, dateOfBirth, gender }),
      })

      const d = await res.json()

      if (d.success) {
        toast.success("Profile updated successfully")
        await update()
      } else {
        toast.error(d.error ?? "Failed to update profile")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const isVerified = !!session?.user?.emailVerified

  const fields = [
    { key: "phone", filled: !!phone },
    { key: "dateOfBirth", filled: !!dateOfBirth },
    { key: "gender", filled: !!gender },
    { key: "emailVerified", filled: isVerified },
  ]
  const completedCount = fields.filter((f) => f.filled).length
  const totalCount = fields.length
  const completionPercent = Math.round((completedCount / totalCount) * 100)

  if (fetching) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Settings</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Profile Completion</p>
            <p className="text-sm text-muted-foreground">{completionPercent}%</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700 rounded-full"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
            {fields.map((f) => (
              <span key={f.key} className="flex items-center gap-1">
                {f.filled ? (
                  <BadgeCheck className="h-3 w-3 text-primary" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-muted-foreground/50" />
                )}
                {f.key === "emailVerified" ? "Email Verified" : f.key.charAt(0).toUpperCase() + f.key.slice(1)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {!phone && (
        <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 rounded-2xl shadow-sm">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <Phone className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              Add a phone number for faster checkout.
            </p>
          </CardContent>
        </Card>
      )}

      {!isVerified && (
        <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 rounded-2xl shadow-sm">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <Mail className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              Email not verified.{" "}
              <Link href="/account" className="font-medium underline underline-offset-2 hover:text-amber-900">
                Verify now
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={session?.user?.email ?? ""}
                disabled
                className="h-11 rounded-xl bg-muted/30"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth (optional)</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender (optional)</Label>
              <Select value={gender || undefined} onValueChange={(v) => setGender(v ?? "")}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
