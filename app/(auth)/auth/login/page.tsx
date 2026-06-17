"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { isAdminRole } from "@/lib/permissions"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function getSafeCallbackUrl(url: string | null): string {
    if (!url) return "/account"
    try {
      const parsed = new URL(url, "http://localhost")
      if (parsed.origin !== "http://localhost") return "/account"
      const path = parsed.pathname
      if (path.startsWith("/auth/") || path.startsWith("/admin") || path === "/") return "/account"
      return path
    } catch {
      return "/account"
    }
  }

  const rawCallbackUrl = searchParams.get("callbackUrl")
  const callbackUrl = getSafeCallbackUrl(rawCallbackUrl)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (searchParams.get("reset") === "success") {
      setResetSuccess(true)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid email or password")
        return
      }

      const sessionRes = await fetch("/api/auth/session")
      const sessionData = await sessionRes.json()

      if (isAdminRole(sessionData?.user?.role ?? "")) {
        toast.error("Please use the admin login portal")
        await signOut({ redirect: false })
        router.push("/admin/login")
        return
      }

      toast.success("Signed in successfully")
      router.refresh()
      router.replace(callbackUrl)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f1] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-neutral-950 text-lg font-black text-white">
              D
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your account
          </p>
        </div>

        {resetSuccess && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800">
              Password reset successfully. You can now sign in with your new password.
            </p>
          </div>
        )}

        <Card className="border-border/50 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  autoComplete="email"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-medium text-foreground hover:text-primary transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f7f5f1] px-4"><p className="text-muted-foreground">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
