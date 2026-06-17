"use client"

import { Fragment, useEffect, useState } from "react"
import { Archive, CheckCheck, Eye, Mail, Phone } from "lucide-react"
import { toast } from "sonner"
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusBadge,
  AdminTableShell,
} from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ContactMessage = {
  id: string
  name: string
  email: string | null
  phone: string | null
  subject: string | null
  message: string
  status: "new" | "read" | "archived"
  source: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  updatedAt: string
}

type MessageStats = {
  new: number
  read: number
  archived: number
  total: number
}

const statusTabs = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
]

function preview(message: string) {
  return message.length > 120 ? `${message.slice(0, 120)}...` : message
}

export default function SupportMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [stats, setStats] = useState<MessageStats>({ new: 0, read: 0, archived: 0, total: 0 })
  const [status, setStatus] = useState("new")
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [status])

  async function fetchMessages() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/support/messages?status=${status}`)
      const data = await response.json()
      if (!data.success) {
        toast.error(data.error ?? "Failed to load messages")
        return
      }
      setMessages(data.data.messages)
      setStats(data.data.stats)
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, nextStatus: "new" | "read" | "archived") {
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/admin/support/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.error ?? "Failed to update message")
        return
      }
      toast.success(nextStatus === "archived" ? "Message archived" : "Message updated")
      await fetchMessages()
    } catch {
      toast.error("Failed to update message")
    } finally {
      setUpdatingId(null)
    }
  }

  const countFor = (key: string) => {
    if (key === "all") return stats.total
    return stats[key as keyof MessageStats]
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Support"
        title="Contact Messages"
        description="Customer inquiries submitted through the contact form."
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200/60 bg-white p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              status === tab.key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {countFor(tab.key) > 0 && <span className="ml-1 opacity-60">({countFor(tab.key)})</span>}
          </button>
        ))}
      </div>

      <AdminTableShell>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No contact messages found"
              description="Customer inquiries submitted through the contact form will appear here."
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((item) => (
                <Fragment key={item.id}>
                  <tr className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <div className="mt-1 space-y-1 text-xs text-slate-400">
                        {item.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {item.email}
                          </p>
                        )}
                        {item.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {item.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="max-w-xl px-4 py-3 align-top">
                      <p className="font-medium text-slate-800">{item.subject || "No subject"}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{preview(item.message)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <AdminStatusBadge status={item.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          title="View message"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {item.status === "new" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md text-xs"
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "read")}
                          >
                            <CheckCheck className="mr-1 h-3.5 w-3.5" />
                            Read
                          </Button>
                        )}
                        {item.status !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md text-xs text-slate-600"
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "archived")}
                          >
                            <Archive className="mr-1 h-3.5 w-3.5" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50/30 px-4 py-4">
                        <div className="space-y-3 border-l-2 border-slate-200 pl-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full message</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                          </div>
                          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                            <p>Source: {item.source}</p>
                            <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableShell>
    </AdminPageShell>
  )
}
