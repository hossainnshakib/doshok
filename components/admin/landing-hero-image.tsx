"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, Link as LinkIcon, X, Maximize2 } from "lucide-react"
import { toast } from "sonner"

type Props = {
  image: string
  onChange: (url: string) => void
}

export function LandingHeroImage({ image, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [urlValue, setUrlValue] = useState("")

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
      formData.append("folder", "landing")

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        onChange(data.data.secureUrl as string)
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

  function addUrl() {
    const trimmed = urlValue.trim()
    if (!trimmed) return
    onChange(trimmed)
    setUrlValue("")
    setShowUrlInput(false)
  }

  return (
    <>
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {image ? (
            <>
              <img src={image} alt="Hero" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/20"
              >
                <Maximize2 className="h-5 w-5 text-white opacity-0 transition hover:opacity-100" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">No image</div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-1.5">
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-1.5">
            {!image ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="h-7 rounded-md text-[11px] px-2.5"
              >
                {uploading ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-3 w-3" />
                )}
                Upload
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="h-7 rounded-md text-[11px] px-2.5"
                >
                  {uploading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-3 w-3" />
                  )}
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="h-7 rounded-md text-[11px] px-2.5"
                >
                  <Maximize2 className="mr-1 h-3 w-3" />
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange("")}
                  className="h-7 rounded-md text-[11px] px-2.5 text-red-500 hover:text-red-600"
                >
                  <X className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="h-7 rounded-md text-[11px] px-2.5 text-slate-500"
          >
            <LinkIcon className="mr-1 h-3 w-3" />
            {showUrlInput ? "Cancel" : "Paste URL"}
          </Button>
          {showUrlInput && (
            <div className="flex items-center gap-1.5">
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://..."
                className="h-7 text-[11px] w-48"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addUrl}
                disabled={!urlValue.trim()}
                className="h-7 rounded-md text-[11px] px-2"
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Full preview modal */}
      {showPreview && image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={image} alt="Hero preview" className="max-h-[90vh] max-w-[90vw] object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
