"use client"

import { useEffect, useState } from "react"
import { AdminPageHeader, AdminTableShell, AdminStatusBadge, AdminPageShell } from "@/components/admin/admin-ui"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Edit, Eye, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type CareerPost = {
  id: string
  title: string
  slug: string
  department: string
  location: string
  employmentType: string
  salaryRange: string | null
  deadline: string | null
  excerpt: string | null
  description: string
  responsibilities: string | null
  requirements: string | null
  benefits: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = ["Draft", "Open", "Closed"]
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"]

export default function AdminCareersPage() {
  const [posts, setPosts] = useState<CareerPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<CareerPost | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [filter])

  async function fetchPosts() {
    setLoading(true)
    try {
      const statusParam = filter === "all" ? "" : `?status=${filter}`
      const res = await fetch(`/api/careers?admin=true${statusParam}`)
      const data = await res.json()
      if (data.success) setPosts(data.data)
    } catch { }
    setLoading(false)
  }

  async function handleSave(formData: FormData) {
    setSaving(true)
    try {
      const payload = {
        title: formData.get("title") as string,
        slug: (formData.get("slug") as string).toLowerCase().replace(/\s+/g, "-"),
        department: formData.get("department") as string,
        location: formData.get("location") as string,
        employmentType: formData.get("employmentType") as string,
        salaryRange: formData.get("salaryRange") as string || null,
        deadline: formData.get("deadline") as string || null,
        excerpt: formData.get("excerpt") as string || null,
        description: formData.get("description") as string,
        responsibilities: formData.get("responsibilities") as string || null,
        requirements: formData.get("requirements") as string || null,
        benefits: formData.get("benefits") as string || null,
        status: formData.get("status") as string,
      }

      const url = editing ? `/api/careers/${editing.id}` : "/api/careers"
      const method = editing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error)
        return
      }
      toast.success(editing ? "Career post updated" : "Career post created")
      setModal(null)
      setEditing(null)
      fetchPosts()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this career post?")) return
    const res = await fetch(`/api/careers/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      toast.success("Career post deleted")
      fetchPosts()
    } else {
      toast.error(data.error)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Careers"
        title="Career Posts"
        description="Manage job listings for the careers page."
        backHref="/admin/dashboard"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200/60 bg-white p-1">
          {["all", ...STATUS_OPTIONS].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize",
                filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="h-8 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800"
          onClick={() => { setEditing(null); setModal("create") }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Post
        </Button>
      </div>

      <AdminTableShell>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No career posts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Deadline</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{post.title}</td>
                  <td className="px-4 py-3 text-slate-600">{post.department}</td>
                  <td className="px-4 py-3 text-slate-600">{post.location}</td>
                  <td className="px-4 py-3 text-slate-600">{post.employmentType}</td>
                  <td className="px-4 py-3"><AdminStatusBadge status={post.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {post.deadline ? new Date(post.deadline).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "Open" && (
                        <button
                          onClick={() => {
                            const w = window.open(`/careers/${post.slug}`, "_blank")
                            if (w) w.focus()
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditing(post); setModal("edit") }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableShell>

      {modal && (
        <CareerPostModal
          post={editing}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null) }}
          saving={saving}
        />
      )}
    </AdminPageShell>
  )
}

function CareerPostModal({
  post,
  onSave,
  onClose,
  saving,
}: {
  post: CareerPost | null
  onSave: (data: FormData) => void
  onClose: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(post?.title ?? "")
  const [slug, setSlug] = useState(post?.slug ?? "")
  const [department, setDepartment] = useState(post?.department ?? "")
  const [location, setLocation] = useState(post?.location ?? "")
  const [employmentType, setEmploymentType] = useState(post?.employmentType ?? "Full-time")
  const [salaryRange, setSalaryRange] = useState(post?.salaryRange ?? "")
  const [deadline, setDeadline] = useState(post?.deadline ? post.deadline.split("T")[0] : "")
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "")
  const [description, setDescription] = useState(post?.description ?? "")
  const [responsibilities, setResponsibilities] = useState(post?.responsibilities ?? "")
  const [requirements, setRequirements] = useState(post?.requirements ?? "")
  const [benefits, setBenefits] = useState(post?.benefits ?? "")
  const [status, setStatus] = useState(post?.status ?? "Draft")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold mb-5">{post ? "Edit Career Post" : "New Career Post"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Title *</label>
              <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Slug *</label>
              <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Department *</label>
              <input name="department" value={department} onChange={(e) => setDepartment(e.target.value)} required placeholder="e.g. Engineering, Marketing" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Location *</label>
              <input name="location" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g. Chattogram, Dhaka, Remote" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Employment Type *</label>
              <select name="employmentType" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
                {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Salary Range</label>
              <input name="salaryRange" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} placeholder="e.g. BDT 50,000 - 80,000" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Deadline</label>
              <input type="date" name="deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Excerpt</label>
            <textarea name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Brief summary shown in listings" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Description *</label>
            <textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder="Full job description" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Responsibilities</label>
            <textarea name="responsibilities" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} rows={3} placeholder="Key responsibilities (one per line)" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Requirements</label>
            <textarea name="requirements" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="Qualifications and requirements (one per line)" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Benefits</label>
            <textarea name="benefits" value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={3} placeholder="What we offer (one per line)" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-primary/20">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800" disabled={saving}>
              {saving ? "Saving..." : post ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}