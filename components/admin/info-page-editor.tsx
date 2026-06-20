"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react"
import type { InfoPageData, InfoPageSection, InfoPageAction } from "@/components/store/info-page"

interface InfoPageEditorProps {
  initialData: InfoPageData
  onSave: (data: InfoPageData) => Promise<void>
  saving: boolean
  hideTables?: boolean
}

export function InfoPageEditor({ initialData, onSave, saving, hideTables }: InfoPageEditorProps) {
  const [data, setData] = useState<InfoPageData>(() => ({
    ...initialData,
    actions: initialData.actions ?? [],
    stats: initialData.stats ?? [],
    sections: initialData.sections ?? [],
  }))

  function updateField<K extends keyof InfoPageData>(key: K, value: InfoPageData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSave(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <HeroSection data={data} onChange={(d) => setData(d)} />
      <ActionsSection
        actions={data.actions ?? []}
        onChange={(actions) => updateField("actions", actions)}
      />
      <StatsSection
        stats={data.stats ?? []}
        onChange={(stats) => updateField("stats", stats)}
      />
      <SectionsSection
        sections={data.sections}
        onChange={(sections) => updateField("sections", sections)}
        hideTables={hideTables}
      />
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="submit" className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs font-semibold" disabled={saving}>
          {saving ? "Saving..." : "Save Info Page"}
        </Button>
      </div>
    </form>
  )
}

function HeroSection({
  data,
  onChange,
}: {
  data: InfoPageData
  onChange: (data: InfoPageData) => void
}) {
  function update<K extends keyof InfoPageData>(key: K, value: InfoPageData[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Hero</h3>
        <p className="text-xs text-slate-400">The header section shown at the top of the page.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Eyebrow</Label>
          <Input
            value={data.eyebrow}
            onChange={(e) => update("eyebrow", e.target.value)}
            placeholder="e.g. Our House"
            className="text-xs h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Title *</Label>
          <Input
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Page title"
            required
            className="text-xs h-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Description</Label>
        <textarea
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  )
}

function ActionsSection({
  actions,
  onChange,
}: {
  actions: InfoPageAction[]
  onChange: (actions: InfoPageAction[]) => void
}) {
  function add() {
    onChange([...actions, { label: "", href: "", variant: "primary" }])
  }

  function remove(index: number) {
    onChange(actions.filter((_, i) => i !== index))
  }

  function update(index: number, field: keyof InfoPageAction, value: string) {
    const next = [...actions]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Call-to-Action Buttons</h3>
          <p className="text-xs text-slate-400">Optional action buttons shown in the hero area.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 rounded-lg text-xs font-semibold">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {actions.length === 0 && (
        <p className="text-xs text-slate-400 py-2">No actions configured. Add a button for visitors to take action.</p>
      )}
      {actions.map((action, i) => (
        <div key={i} className="flex items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Label</Label>
            <Input value={action.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Shop Collection" className="h-8 text-xs" />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">URL</Label>
            <Input value={action.href} onChange={(e) => update(i, "href", e.target.value)} placeholder="/products" className="h-8 text-xs" />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Style</Label>
            <Select value={action.variant} onValueChange={(v) => v && update(i, "variant", v as string)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary" className="text-xs">Primary</SelectItem>
                <SelectItem value="secondary" className="text-xs">Secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button type="button" onClick={() => remove(i)} className="shrink-0 mb-0.5 p-1.5 rounded-md text-slate-400 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function StatsSection({
  stats,
  onChange,
}: {
  stats: { value: string; label: string }[]
  onChange: (stats: { value: string; label: string }[]) => void
}) {
  function add() {
    onChange([...stats, { value: "", label: "" }])
  }

  function remove(index: number) {
    onChange(stats.filter((_, i) => i !== index))
  }

  function update(index: number, field: "value" | "label", value: string) {
    const next = [...stats]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Statistics</h3>
          <p className="text-xs text-slate-400">Optional stats shown in the hero sidebar.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 rounded-lg text-xs font-semibold">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {stats.length === 0 && (
        <p className="text-xs text-slate-400 py-2">No statistics configured.</p>
      )}
      {stats.map((stat, i) => (
        <div key={i} className="flex items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Value</Label>
            <Input value={stat.value} onChange={(e) => update(i, "value", e.target.value)} placeholder="e.g. 100%" className="h-8 text-xs" />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Label</Label>
            <Input value={stat.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="e.g. Quality checked" className="h-8 text-xs" />
          </div>
          <button type="button" onClick={() => remove(i)} className="shrink-0 mb-0.5 p-1.5 rounded-md text-slate-400 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function SectionsSection({
  sections,
  onChange,
  hideTables,
}: {
  sections: InfoPageSection[]
  onChange: (sections: InfoPageSection[]) => void
  hideTables?: boolean
}) {
  function add() {
    onChange([...sections, { id: "", title: "" }])
  }

  function remove(index: number) {
    onChange(sections.filter((_, i) => i !== index))
  }

  function update(index: number, section: InfoPageSection) {
    const next = [...sections]
    next[index] = section
    onChange(next)
  }

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...sections]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  function moveDown(index: number) {
    if (index === sections.length - 1) return
    const next = [...sections]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Sections</h3>
          <p className="text-xs text-slate-400">Content sections displayed on the page.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 rounded-lg text-xs font-semibold">
          <Plus className="h-3 w-3 mr-1" /> Add Section
        </Button>
      </div>
      {sections.length === 0 && (
        <p className="text-xs text-slate-400 py-2">No sections yet. Add at least one section.</p>
      )}
      {sections.map((section, i) => (
        <SectionEditor
          key={i}
          section={section}
          onChange={(s) => update(i, s)}
          onRemove={() => remove(i)}
          onMoveUp={() => moveUp(i)}
          onMoveDown={() => moveDown(i)}
          isFirst={i === 0}
          isLast={i === sections.length - 1}
          hideTables={hideTables}
        />
      ))}
    </div>
  )
}

function SectionEditor({
  section,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  hideTables,
}: {
  section: InfoPageSection
  onChange: (section: InfoPageSection) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  hideTables?: boolean
}) {
  const [open, setOpen] = useState(true)

  function update<K extends keyof InfoPageSection>(key: K, value: InfoPageSection[K]) {
    onChange({ ...section, [key]: value })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
        <button type="button" onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-600">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <GripVertical className="h-3.5 w-3.5 text-slate-300" />
        <span className="flex-1 text-xs font-medium text-slate-600 truncate">
          {section.title || `Section ${section.id || "(untitled)"}`}
        </span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">
            ↓
          </button>
          <button type="button" onClick={onRemove} className="p-1 rounded text-slate-400 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">ID (anchor)</Label>
              <Input value={section.id ?? ""} onChange={(e) => update("id", e.target.value || undefined)} placeholder="section-id" className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Eyebrow</Label>
              <Input value={section.eyebrow ?? ""} onChange={(e) => update("eyebrow", e.target.value || undefined)} placeholder="Optional tag" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Title *</Label>
              <Input value={section.title} onChange={(e) => update("title", e.target.value)} placeholder="Section title" required className="h-8 text-xs" />
            </div>
          </div>

          <BodyEditor body={section.body ?? []} onChange={(body) => update("body", body.length > 0 ? body : undefined)} />
          <BulletsEditor bullets={section.bullets ?? []} onChange={(bullets) => update("bullets", bullets.length > 0 ? bullets : undefined)} />
          <CardsEditor cards={section.cards ?? []} onChange={(cards) => update("cards", cards.length > 0 ? cards : undefined)} />
          {hideTables ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Tables are managed from the Size Charts section. They are automatically rendered on the public page.
              </p>
            </div>
          ) : (
            <TableEditor
              table={section.table}
              onChange={(table) => update("table", table)}
            />
          )}
          <FaqsEditor faqs={section.faqs ?? []} onChange={(faqs) => update("faqs", faqs.length > 0 ? faqs : undefined)} />
        </div>
      )}
    </div>
  )
}

function BodyEditor({
  body,
  onChange,
}: {
  body: string[]
  onChange: (body: string[]) => void
}) {
  function add() {
    onChange([...body, ""])
  }

  function remove(index: number) {
    onChange(body.filter((_, i) => i !== index))
  }

  function update(index: number, value: string) {
    const next = [...body]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Body Paragraphs</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add} className="h-6 rounded text-xs font-semibold text-slate-500">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {body.map((p, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={p}
            onChange={(e) => update(i, e.target.value)}
            rows={2}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Paragraph text..."
          />
          <button type="button" onClick={() => remove(i)} className="shrink-0 self-start p-1.5 rounded-md text-slate-400 hover:text-red-500 mt-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[]
  onChange: (bullets: string[]) => void
}) {
  function add() {
    onChange([...bullets, ""])
  }

  function remove(index: number) {
    onChange(bullets.filter((_, i) => i !== index))
  }

  function update(index: number, value: string) {
    const next = [...bullets]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bullet Points</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add} className="h-6 rounded text-xs font-semibold text-slate-500">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <Input value={b} onChange={(e) => update(i, e.target.value)} placeholder="Bullet point text" className="flex-1 h-8 text-xs" />
          <button type="button" onClick={() => remove(i)} className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function CardsEditor({
  cards,
  onChange,
}: {
  cards: { title: string; body: string; meta?: string }[]
  onChange: (cards: { title: string; body: string; meta?: string }[]) => void
}) {
  function add() {
    onChange([...cards, { title: "", body: "" }])
  }

  function remove(index: number) {
    onChange(cards.filter((_, i) => i !== index))
  }

  function update(index: number, field: string, value: string) {
    const next = [...cards]
    next[index] = { ...next[index], [field]: value || undefined }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cards</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add} className="h-6 rounded text-xs font-semibold text-slate-500">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {cards.map((card, i) => (
        <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={card.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Card title" className="h-8 text-xs" />
                <Input value={card.meta ?? ""} onChange={(e) => update(i, "meta", e.target.value)} placeholder="Meta label (optional)" className="h-8 text-xs" />
              </div>
              <textarea
                value={card.body}
                onChange={(e) => update(i, "body", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Card body text..."
              />
            </div>
            <button type="button" onClick={() => remove(i)} className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function TableEditor({
  table,
  onChange,
}: {
  table?: { headers: string[]; rows: string[][] }
  onChange: (table: { headers: string[]; rows: string[][] } | undefined) => void
}) {
  const hasTable = table !== undefined

  function enable() {
    onChange({ headers: [""], rows: [[""]] })
  }

  function disable() {
    onChange(undefined)
  }

  function updateHeader(index: number, value: string) {
    if (!table) return
    const headers = [...table.headers]
    headers[index] = value
    onChange({ ...table, headers })
  }

  function addHeader() {
    if (!table) return
    const headers = [...table.headers, ""]
    const rows = table.rows.map((r) => [...r, ""])
    onChange({ ...table, headers, rows })
  }

  function removeHeader(index: number) {
    if (!table) return
    const headers = table.headers.filter((_, i) => i !== index)
    const rows = table.rows.map((r) => r.filter((_, i) => i !== index))
    onChange({ ...table, headers, rows })
  }

  function addRow() {
    if (!table) return
    onChange({ ...table, rows: [...table.rows, table.headers.map(() => "")] })
  }

  function updateRow(rowIndex: number, colIndex: number, value: string) {
    if (!table) return
    const rows = [...table.rows]
    rows[rowIndex] = [...rows[rowIndex]]
    rows[rowIndex][colIndex] = value
    onChange({ ...table, rows })
  }

  function removeRow(index: number) {
    if (!table) return
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Table</Label>
        {hasTable ? (
          <Button type="button" variant="ghost" size="sm" onClick={disable} className="h-6 rounded text-xs font-semibold text-red-500">
            Remove Table
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={enable} className="h-6 rounded text-xs font-semibold text-slate-500">
            Add Table
          </Button>
        )}
      </div>
      {hasTable && table && (
        <div className="space-y-2 overflow-x-auto">
          <div className="flex gap-2 items-end">
            {table.headers.map((header, i) => (
              <div key={i} className="flex-1 min-w-[100px] space-y-1">
                <Label className="text-[9px] text-slate-400 uppercase tracking-wider">Col {i + 1}</Label>
                <Input value={header} onChange={(e) => updateHeader(i, e.target.value)} placeholder="Header" className="h-7 text-[11px]" />
              </div>
            ))}
            <button type="button" onClick={addHeader} className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-600">
              <Plus className="h-3.5 w-3.5" />
            </button>
            {table.headers.length > 1 && (
              <button type="button" onClick={() => removeHeader(table.headers.length - 1)} className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {table.rows.map((row, ri) => (
            <div key={ri} className="flex gap-2 items-start">
              {row.map((cell, ci) => (
                <div key={ci} className="flex-1 min-w-[100px]">
                  <Input value={cell} onChange={(e) => updateRow(ri, ci, e.target.value)} placeholder="..." className="h-7 text-[11px]" />
                </div>
              ))}
              <button type="button" onClick={() => removeRow(ri)} className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addRow} className="h-7 rounded text-xs font-semibold text-slate-500">
            <Plus className="h-3 w-3 mr-1" /> Add Row
          </Button>
        </div>
      )}
    </div>
  )
}

function FaqsEditor({
  faqs,
  onChange,
}: {
  faqs: { question: string; answer: string }[]
  onChange: (faqs: { question: string; answer: string }[]) => void
}) {
  function add() {
    onChange([...faqs, { question: "", answer: "" }])
  }

  function remove(index: number) {
    onChange(faqs.filter((_, i) => i !== index))
  }

  function update(index: number, field: "question" | "answer", value: string) {
    const next = [...faqs]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">FAQ Items</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add} className="h-6 rounded text-xs font-semibold text-slate-500">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {faqs.map((faq, i) => (
        <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <div className="flex-1 space-y-2">
              <Input value={faq.question} onChange={(e) => update(i, "question", e.target.value)} placeholder="Question" className="h-8 text-xs font-medium" />
              <textarea
                value={faq.answer}
                onChange={(e) => update(i, "answer", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Answer..."
              />
            </div>
            <button type="button" onClick={() => remove(i)} className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
