"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle, Mail, MapPin, Phone, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Settings = {
  phone: string
  supportEmail: string
  whatsapp: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  address: string
}

export default function ContactPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch("/api/site-settings")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setSettings(data.data)
      })
      .catch(() => {})
  }, [])

  function update(field: string, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name || !form.message) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (data.success) {
        setSubmitted(true)
        setForm({ name: "", email: "", phone: "", subject: "", message: "" })
      } else {
        toast.error(data.error ?? "Failed to send message")
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const phone = settings?.phone || ""
  const email = settings?.supportEmail ?? "hello@doshok.com"
  const address = settings?.address ?? "We deliver across all districts of Bangladesh."

  if (submitted) {
    return (
      <main className="bg-[#f7f5f1] py-12 md:py-20">
        <div className="container mx-auto container-px max-w-xl">
          <div className="rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Message sent</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Thank you for reaching out. Doshok support will get back to you as soon as possible.
            </p>
            <Button onClick={() => setSubmitted(false)} className="mt-8 h-12 rounded-full px-8">
              Send Another Message
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-[#f7f5f1]">
      <section className="container mx-auto container-px pt-8 md:pt-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#15191c] text-white shadow-2xl shadow-black/10">
          <div className="grid gap-8 p-7 md:grid-cols-[1.05fr_0.95fr] md:p-12 lg:p-16">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Contact</p>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
                We are here for orders, sizing, and support.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Send a message about products, delivery, exchanges, bulk questions, or anything you need before checkout.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-[1.6rem] bg-white/8 p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.22),transparent_32%)]" />
              <div className="relative space-y-4">
                {[
                  ...(phone ? [{ icon: Phone, title: "Call", value: phone, detail: settings?.whatsapp ? `WhatsApp: ${settings.whatsapp}` : "Sat–Thu, 10 AM – 8 PM" }] : []),
                  { icon: Mail, title: "Email", value: email, detail: "We respond within 24 hours" },
                  { icon: MapPin, title: "Service Area", value: address, detail: "Nationwide delivery support" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <div className="flex gap-3">
                      <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{item.title}</p>
                        <p className="mt-1 text-sm font-semibold">{item.value}</p>
                        <p className="mt-1 text-xs text-white/50">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto container-px grid gap-6 py-8 md:grid-cols-[0.85fr_1.15fr] md:py-12">
        <aside className="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <Sparkles className="mb-5 h-8 w-8 text-red-500" />
          <h2 className="text-2xl font-black tracking-tight">Before you write</h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-neutral-600">
            <p>For order tracking, use your order number and phone on the Track Order page.</p>
            <p>For sizing, include product name, height, and preferred fit so we can help faster.</p>
            <p>For returns or exchanges, include photos and your order number.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/track-order" className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white">
              Track Order
            </Link>
            <Link href="/size-guide" className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold">
              Size Guide
            </Link>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={form.name} onChange={(event) => update("name", event.target.value)} required className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={form.subject} onChange={(event) => update("subject", event.target.value)} className="h-12 rounded-2xl" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea id="message" value={form.message} onChange={(event) => update("message", event.target.value)} required rows={6} className="rounded-2xl" />
          </div>
          <Button type="submit" disabled={loading} className="mt-5 h-12 w-full rounded-full">
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </section>
    </main>
  )
}
