"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AdminPageHeader, AdminStatusBadge, AdminTableShell, AdminEmptyState } from "@/components/admin/admin-ui"
import { Shield, User, UserCheck, UserX } from "lucide-react"
import { ROLES, ROLE_LABELS, hasSettingsAccess } from "@/lib/permissions"
import type { Role } from "@/lib/permissions"

type UserData = {
  id: string
  name: string | null
  email: string | null
  role: string
  isActive: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      const json = await res.json()
      if (json.success) {
        setUsers(json.data as UserData[])
      }
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login")
      return
    }
    if (status === "authenticated") {
      if (!hasSettingsAccess(session?.user?.role ?? "")) {
        router.push("/admin/dashboard")
        return
      }
      fetchUsers()
    }
  }, [status, session, router, fetchUsers])

  const adminUsers = users.filter((u) => u.role !== "customer")
  const canManageUsers = session?.user?.role === "super_admin"

  if (loading) {
    return (
      <div className="space-y-5">
        <AdminPageHeader eyebrow="Settings" title="Admin Users" description="Loading..." />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Settings"
        title="Admin Users"
        description={`${adminUsers.length} admin user${adminUsers.length === 1 ? "" : "s"} in the system.`}
      />

      {adminUsers.length === 0 ? (
        <AdminEmptyState title="No admin users" description="Admin users will appear here." />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">User</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Email</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Role</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Created</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={session?.user?.id ?? ""}
                  canManageUsers={canManageUsers}
                  onUpdated={fetchUsers}
                />
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}
    </div>
  )
}

function UserRow({
  user,
  currentUserId,
  canManageUsers,
  onUpdated,
}: {
  user: UserData
  currentUserId: string
  canManageUsers: boolean
  onUpdated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  async function updateRole(newRole: string | null) {
    if (!newRole) return
    if (newRole === user.role) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Role updated")
        onUpdated()
      } else {
        toast.error(json.error ?? "Failed to update role")
      }
    } catch {
      toast.error("Failed to update role")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(user.isActive ? "User deactivated" : "User activated")
        setDialogOpen(false)
        onUpdated()
      } else {
        toast.error(json.error ?? "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  const isSelf = user.id === currentUserId
  const adminRoles = ROLES.filter((r) => r !== "customer")

  return (
    <TableRow className="border-slate-50 hover:bg-slate-50/60">
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <span className="text-xs font-semibold text-slate-800">{user.name || "—"}</span>
          {isSelf && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">You</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-slate-500">{user.email || "—"}</TableCell>
      <TableCell>
        <Select
          value={user.role}
          onValueChange={updateRole}
          disabled={!canManageUsers || saving || (isSelf && user.role === "super_admin")}
        >
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {adminRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role as Role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <AdminStatusBadge status={user.isActive ? "active" : "inactive"} />
      </TableCell>
      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
        {new Date(user.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogTrigger render={<Button variant="outline" size="xs" />}>
              <User className="h-3 w-3" />
              <span>View</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Admin User Details</DialogTitle>
                <DialogDescription>
                  Basic account information for {user.name || user.email || "this user"}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <DetailRow label="Name" value={user.name || "—"} />
                <DetailRow label="Email" value={user.email || "—"} />
                <DetailRow label="Role" value={ROLE_LABELS[user.role as Role] ?? user.role} />
                <DetailRow label="Status" value={user.isActive ? "Active" : "Inactive"} />
                <DetailRow label="Created" value={new Date(user.createdAt).toLocaleDateString()} />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="xs" disabled={!canManageUsers || isSelf} />}
            >
              {user.isActive ? (
                <UserX className="h-3 w-3" />
              ) : (
                <UserCheck className="h-3 w-3" />
              )}
              <span>{user.isActive ? "Deactivate" : "Activate"}</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{user.isActive ? "Deactivate User" : "Activate User"}</DialogTitle>
                <DialogDescription>
                  {user.isActive
                    ? `Are you sure you want to deactivate ${user.name || user.email || "this user"}? They will not be able to access the admin panel.`
                    : `Are you sure you want to activate ${user.name || user.email || "this user"}? They will regain access to the admin panel.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant={user.isActive ? "destructive" : "default"}
                  onClick={toggleActive}
                  disabled={!canManageUsers || saving}
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-700">{value}</span>
    </div>
  )
}
