"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import ImageExtension from "@tiptap/extension-image"
import UnderlineExtension from "@tiptap/extension-underline"
import LinkExtension from "@tiptap/extension-link"
import { Table as TableExtension } from "@tiptap/extension-table"
import { TableRow as TableRowExtension } from "@tiptap/extension-table-row"
import { TableCell as TableCellExtension } from "@tiptap/extension-table-cell"
import { TableHeader as TableHeaderExtension } from "@tiptap/extension-table-header"
import { useCallback, useState } from "react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showSource, setShowSource] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      ImageExtension.configure({ inline: true }),
      LinkExtension.configure({ openOnClick: false }),
      TableExtension.configure({ resizable: true }),
      TableRowExtension,
      TableCellExtension,
      TableHeaderExtension,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const clean = sanitize(html)
      onChange(clean)
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm",
      },
    },
  })

  const sanitize = useCallback((html: string): string => {
    if (typeof window === "undefined") return html
    try {
      const doc = new DOMParser().parseFromString(html, "text/html")
      const scripts = doc.querySelectorAll("script, iframe, object, embed, form, input, button, textarea, select, style, link")
      scripts.forEach((el) => el.remove())
      const handlers = ["onabort", "onautocomplete", "onautocompleteerror", "onblur", "oncancel", "oncanplay", "oncanplaythrough", "onchange", "onclick", "onclose", "oncontextmenu", "oncuechange", "ondblclick", "ondrag", "ondragend", "ondragenter", "ondragexit", "ondragleave", "ondragover", "ondragstart", "ondrop", "ondurationchange", "onemptied", "onended", "onerror", "onfocus", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload", "onloadeddata", "onloadedmetadata", "onloadstart", "onmousedown", "onmouseenter", "onmouseleave", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onmousewheel", "onpause", "onplay", "onplaying", "onprogress", "onratechange", "onreset", "onresize", "onscroll", "onseeked", "onseeking", "onselect", "onshow", "onsort", "onstalled", "onsubmit", "onsuspend", "ontimeupdate", "ontoggle", "onvolumechange", "onwaiting", "onwheel"]
      doc.body.querySelectorAll("*").forEach((el) => {
        handlers.forEach((h) => el.removeAttribute(h))
      })
      return doc.body.innerHTML
    } catch {
      return html
    }
  }, [])

  function toggleSource() {
    if (!editor) return
    if (!showSource) {
      setSourceContent(editor.getHTML())
      setShowSource(true)
    } else {
      editor.commands.setContent(sourceContent)
      setShowSource(false)
    }
  }

  function handleSourceChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSourceContent(e.target.value)
    onChange(sanitize(e.target.value))
  }

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    active,
    label,
    title,
  }: {
    onClick: () => void
    active?: boolean
    label: string
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  )

  function addImage() {
    const url = window.prompt("Image URL")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  function addLink() {
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("Link URL", previousUrl || "")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url }).run()
  }

  const [sourceContent, setSourceContent] = useState("")

  return (
    <div className="rich-text-editor border border-border rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-slate-50">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="B" title="Bold" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="I" title="Italic" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} label="U" title="Underline" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="H1" title="Heading 1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2" title="Heading 2" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3" title="Heading 3" />
        <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} label="P" title="Paragraph" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="• List" title="Bullet List" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="1. List" title="Numbered List" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label='" Quote' title="Blockquote" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={addLink} active={editor.isActive("link")} label="🔗 Link" title="Insert Link" />
        <ToolbarButton onClick={addImage} label="🖼 Img" title="Insert Image" />
        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={editor.isActive("table")} label="⊞ Table" title="Insert Table" />
        {editor.isActive("table") && (
          <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} label="✕ Table" title="Delete Table" />
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton onClick={toggleSource} active={showSource} label="< >" title="Toggle HTML Source" />
        </div>
      </div>
      {showSource ? (
        <textarea
          value={sourceContent}
          onChange={handleSourceChange}
          className="w-full min-h-[200px] p-4 text-sm font-mono border-0 resize-none focus:outline-none"
          placeholder={placeholder}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  )
}
