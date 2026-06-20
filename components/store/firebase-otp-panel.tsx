"use client"

import { startTransition, useState, useRef, useEffect, useCallback } from "react"
import type { ConfirmationResult } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Smartphone, CheckCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { normalizePhoneToE164, isValidBdPhone } from "@/lib/checkout/phone"

type FirebaseOtpPanelProps = {
  phone: string
  disabled?: boolean
  onVerified: (checkoutVerificationToken: string, normalizedPhone: string) => void
  onReset?: () => void
  resetSignal?: number
  cooldownSeconds?: number
  tokenTtlSeconds?: number
}

export function FirebaseOtpPanel({
  phone,
  disabled = false,
  onVerified,
  onReset,
  resetSignal = 0,
}: FirebaseOtpPanelProps) {
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "verifying" | "verified" | "error"
  >("idle")
  const [code, setCode] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const verifierRef = useRef<{ clear: () => void } | null>(null)

  const startCooldown = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    setCooldownRemaining(seconds)
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          cooldownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  useEffect(() => {
    if (resetSignal === 0) return
    startTransition(() => {
      setState("idle")
      setCode("")
      setErrorMessage("")
      confirmationResultRef.current = null
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current)
        cooldownRef.current = null
      }
      setCooldownRemaining(0)
    })
  }, [resetSignal])

  useEffect(() => {
    if (!phone) {
      startTransition(() => {
        setState("idle")
        setCode("")
        setErrorMessage("")
        confirmationResultRef.current = null
      })
      return
    }
    if (state !== "verified" && phone) {
      startTransition(() => {
        setState("idle")
        setCode("")
        setErrorMessage("")
      })
    }
  }, [phone, state])

  async function handleSendOtp() {
    if (!phone.trim() || !isValidBdPhone(phone.trim())) {
      toast.error("Enter a valid Bangladesh mobile number")
      return
    }

    const e164Phone = normalizePhoneToE164(phone.trim())
    setState("sending")
    setErrorMessage("")

    try {
      const res = await fetch("/api/checkout/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164Phone }),
      })
      const d = await res.json()
      if (!d.success) {
        setState("error")
        setErrorMessage(d.error ?? "Failed to send OTP")
        toast.error(d.error ?? "Failed to send OTP")
        return
      }

      const cooldown = d.data.cooldownSeconds ?? 30
      startCooldown(cooldown)

      const { sendFirebasePhoneOtp } = await import("@/lib/firebase/client")
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
      if (verifierRef.current) {
        try {
          verifierRef.current.clear()
        } catch {
        }
        verifierRef.current = null
      }

      const confirmationResult = await sendFirebasePhoneOtp(
        e164Phone,
        "firebase-recaptcha-container"
      )
      confirmationResultRef.current = confirmationResult
      setState("sent")
      toast.success(`OTP sent to ${e164Phone}`)
    } catch (err) {
      console.error("Firebase OTP send error:", err)
      setState("error")
      const msg =
        err instanceof Error ? err.message : "Failed to send OTP via Firebase"
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  async function handleVerifyOtp() {
    if (!code.trim()) {
      setErrorMessage("Enter the OTP code")
      return
    }
    if (!phone.trim() || !isValidBdPhone(phone.trim())) {
      toast.error("Invalid phone number")
      return
    }
    if (!confirmationResultRef.current) {
      setErrorMessage("No OTP request found. Please request a new OTP.")
      return
    }

    const e164Phone = normalizePhoneToE164(phone.trim())
    setState("verifying")
    setErrorMessage("")

    try {
      const { confirmFirebasePhoneOtp } = await import("@/lib/firebase/client")
      const firebaseIdToken = await confirmFirebasePhoneOtp(
        confirmationResultRef.current!,
        code.trim()
      )

      const res = await fetch("/api/checkout/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: e164Phone,
          firebaseIdToken,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setState("verified")
        setCode("")
        setErrorMessage("")
        if (cooldownRef.current) {
          clearInterval(cooldownRef.current)
          cooldownRef.current = null
        }
        setCooldownRemaining(0)
        onVerified(d.data.checkoutVerificationToken, e164Phone)
      } else {
        setState("sent")
        setErrorMessage(d.error ?? "Verification failed")
        toast.error(d.error ?? "Verification failed")
      }
    } catch (err) {
      console.error("Firebase OTP verify error:", err)
      setState("sent")
      const msg =
        err instanceof Error ? err.message : "Verification failed"
      setErrorMessage(msg)
      toast.error(msg)
    }
  }

  function handleReset() {
    setState("idle")
    setCode("")
    setErrorMessage("")
    confirmationResultRef.current = null
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
      cooldownRef.current = null
    }
    setCooldownRemaining(0)
    if (onReset) onReset()
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} id="firebase-recaptcha-container" />

      {state === "verified" ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700">
                Phone Verified
              </p>
              <p className="text-xs text-green-600">
                {normalizePhoneToE164(phone)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Phone Verification</span>
          </div>

          {state === "idle" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendOtp}
              disabled={
                disabled ||
                !phone.trim() ||
                !isValidBdPhone(phone.trim())
              }
              className="h-11 rounded-xl"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Send OTP
            </Button>
          )}

          {state === "sending" && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Sending OTP...
            </p>
          )}

          {(state === "sent" ||
            state === "verifying" ||
            state === "error") && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                {normalizePhoneToE164(phone)}
              </p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                    setErrorMessage("")
                  }}
                  placeholder="000000"
                  className="h-11 rounded-xl w-40 text-center text-lg tracking-widest font-mono"
                  disabled={state === "verifying" || disabled}
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={
                    state === "verifying" ||
                    code.length < 6 ||
                    disabled
                  }
                  className="h-11 rounded-xl"
                >
                  {state === "verifying" ? "Verifying..." : "Verify"}
                </Button>
              </div>

              {errorMessage && (
                <p className="text-sm text-destructive">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSendOtp}
                  disabled={
                    cooldownRemaining > 0 ||
                    state === "verifying" ||
                    disabled
                  }
                  className="text-xs h-8"
                >
                  Resend OTP
                  {cooldownRemaining > 0 && (
                    <span className="ml-1 inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {cooldownRemaining}s
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
