import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { getCloudinary } from "@/lib/cloudinary"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024

const FOLDER_MAP: Record<string, string> = {
  products: "doshok/products",
  homepage: "doshok/homepage",
  landing: "doshok/landing",
  categories: "doshok/categories",
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return error("Unauthorized", 401)
  }
  if (session.user.role !== "admin") return error("Forbidden", 403)

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folderKey = (formData.get("folder") as string) || "products"

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
