"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { GripVertical, Loader2, Upload, X, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  single?: boolean
  label?: string
  helperText?: string
  folder?: string
}

export function ImageUploader({
  images,
  onChange,
  single,
  label = "Images",
  helperText,
  folder = "products",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  async function handleFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast.error("File must be jpg, jpeg, png, or webp")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        const url = data.data.secureUrl as string
        if (single) {
          onChange([url])
        } else {
          onChange([...images, url])
        }
      } else {
        toast.error(data.error ?? "Upload failed")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function removeImage(index: number) {
    if (single) {
      onChange([])
    } else {
      onChange(images.filter((_, i) => i !== index))
    }
  }

  function addUrl() {
    const trimmed = urlValue.trim()
    if (!trimmed) return
    if (single) {
      onChange([trimmed])
    } else {
      onChange([...images, trimmed])
    }
    setUrlValue("")
    setShowUrlInput(false)
  }

  function handleDragStart(i: number) {
    setDragIndex(i)
  }

  function handleDragOverItem(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    const next = [...images]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(i, 0, moved)
    onChange(next)
    setDragIndex(i)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      {helperText && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}

      {images.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{images.length} image{images.length > 1 ? "s" : ""} {!single && "— drag to reorder"}</p>
          <div className={`grid gap-3 ${single ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
            {images.map((url, i) => (
              <div
                key={i}
                draggable={!single}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOverItem(e, i)}
                onDragEnd={handleDragEnd}
                className={`group relative aspect-square overflow-hidden rounded-xl border bg-muted ${!single ? "cursor-grab active:cursor-grabbing" : ""} ${dragIndex === i ? "opacity-50 ring-2 ring-primary" : ""}`}
              >
                <div className="absolute left-1 top-1 z-10 flex gap-1">
                  {i === 0 && !single && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                      Main
                    </span>
                  )}
                  {!single && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                      <GripVertical className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <img
                  src={url}
                  alt={`Image ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || (single && images.length >= 1)}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="h-9 rounded-full"
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          {uploading ? "Uploading..." : single && images.length >= 1 ? "Uploaded" : "Upload"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 rounded-full text-muted-foreground"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          <LinkIcon className="mr-1.5 h-4 w-4" />
          Paste URL
        </Button>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2">
          <Input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Paste image URL"
            className="h-9"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 rounded-full"
            onClick={addUrl}
            disabled={!urlValue.trim()}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  )
}