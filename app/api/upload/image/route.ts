import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { getCloudinary } from "@/lib/cloudinary"
import { requireAdminPermission } from "@/lib/auth/admin"
import type { PermissionGroup } from "@/lib/permissions"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024

const FOLDER_MAP: Record<string, string> = {
  products: "doshok/products",
  homepage: "doshok/homepage",
  categories: "doshok/categories",
  branding: "doshok/branding",
  pages: "doshok/pages",
  stories: "doshok/stories",
  promo: "doshok/homepage",
  seo: "doshok/products",
}

const FOLDER_PERMISSIONS: Record<string, PermissionGroup> = {
  products: "products",
  categories: "products",
  seo: "products",
  homepage: "cms",
  pages: "cms",
  stories: "cms",
  promo: "cms",
  branding: "settings",
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folderKey = (formData.get("folder") as string) || "products"
    const permission = FOLDER_PERMISSIONS[folderKey] ?? "products"
    const session = await requireAdminPermission(permission)
    if (session instanceof NextResponse) return session

    if (!file) {
      return error("No file provided")
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return error("File must be jpg, jpeg, png, or webp")
    }

    if (file.size > MAX_SIZE) {
      return error("File must be under 5MB")
    }

    const folder = FOLDER_MAP[folderKey] || "doshok/products"
    const buffer = Buffer.from(await file.arrayBuffer())

    const cloudinary = getCloudinary()
    const result = await new Promise<{
      secure_url: string
      public_id: string
      width: number
      height: number
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (err, result) => {
          if (err || !result) return reject(err || new Error("Upload failed"))
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
          })
        }
      )
      uploadStream.end(buffer)
    })

    return success({
      secureUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    })
  } catch {
    return error("Upload failed")
  }
}
