import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Valid email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
})

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().positive(),
  oldPrice: z.number().positive().optional(),
  images: z.array(z.string()).default([]),
  categoryId: z.string().min(1),
  featured: z.boolean().default(false),
  status: z.enum(["Draft", "Active", "Hidden", "Archived"]).default("Draft"),
  defaultCouponCode: z.string().optional(),
  material: z.string().optional(),
  careInstructions: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoImage: z.string().optional(),
  specifications: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
  })).optional(),
  variants: z.array(z.object({
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().optional(),
    stock: z.number().int().nonnegative().default(0),
    sku: z.string().optional(),
  })).optional(),
  sizeChartIds: z.array(z.string()).optional(),
}).refine((data) => data.oldPrice === undefined || data.oldPrice > data.price, {
  message: "Compare price must be greater than the current price",
  path: ["oldPrice"],
})

export const variantSchema = z.object({
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().optional(),
  stock: z.number().int().nonnegative().default(0),
  sku: z.string().optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoImage: z.string().optional(),
})

export const addressSchema = z.object({
  label: z.enum(["Home", "Office", "Family", "Other"]).default("Home"),
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  phone: z.string().regex(/^(\+?880)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number."),
  addressLine1: z.string().min(1, "Address is required").max(500),
  addressLine2: z.string().max(500).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100),
  zone: z.enum(["chatto", "dhaka", "outside"]),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  divisionId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  upazilaId: z.string().optional().nullable(),
  divisionName: z.string().optional().nullable(),
  districtName: z.string().optional().nullable(),
  upazilaName: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
})

export const checkoutSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\+8801[3-9]\d{8}$/, "Phone must be in E.164 format (+8801XXXXXXXXX)"),
  divisionId: z.string().min(1),
  divisionName: z.string().min(1),
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  upazilaId: z.string().min(1),
  upazilaName: z.string().min(1),
  fullAddress: z.string().min(1),
  paymentMethod: z.string().min(1),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
  checkoutVerificationToken: z.string().optional(),
  idempotencyKey: z.string().optional(),
  abandonedCheckoutToken: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
})

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
  deliveryFee: z.number().nonnegative().optional(),
  userId: z.string().optional(),
  email: z.string().email().optional(),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
})

export const resendVerificationSchema = z.object({
  email: z.string().email(),
})

export const otpSendSchema = z.object({
  email: z.string().email(),
})

export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email("Valid email is required").max(255).optional()
  ),
  phone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(40).optional()
  ),
  subject: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(150).optional()
  ),
  message: z.string().trim().min(1, "Message is required").max(5000),
})

export const siteSettingsSchema = z.object({
  brandName: z.string().min(1),
  supportEmail: z.string().email(),
  phone: z.string().min(1),
  whatsapp: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().optional().or(z.literal("")),
  instagramUrl: z.string().optional().or(z.literal("")),
  tiktokUrl: z.string().optional().or(z.literal("")),
  youtubeUrl: z.string().optional().or(z.literal("")),
  address: z.string().min(1),
  footerText: z.string().min(1),
  footerLinks: z.string().optional().default("[]"),
  headerQuickLinks: z.string().optional().default("[]"),
  accentColor: z.string().optional().default("#364152"),
  buttonRadius: z.string().optional().default("xl"),
  cardRadius: z.string().optional().default("1.5rem"),
  storefrontTone: z.string().optional().default("light"),
  adminAccentTone: z.string().optional().default("neutral"),
  headerLogo: z.string().optional().or(z.literal("")),
  footerLogo: z.string().optional().or(z.literal("")),
  favicon: z.string().optional().or(z.literal("")),
  appleTouchIcon: z.string().optional().or(z.literal("")),
  defaultSeoTitle: z.string().optional().or(z.literal("")),
  defaultSeoDescription: z.string().optional().or(z.literal("")),
  defaultSeoImage: z.string().optional().or(z.literal("")),
  defaultSeoKeywords: z.string().optional().or(z.literal("")),
})

export const otpSchema = z.object({
  phone: z.string().min(11),
  code: z.string().length(6),
})

export const paymentProvider = z.enum(["COD"])

export const paymentMode = z.enum(["SANDBOX", "LIVE"])

export const codSettingsSchema = z.object({
  deliveryChargePrepayRequired: z.boolean().optional().default(false),
})

export const providerCredentialsMap: Record<string, z.ZodTypeAny> = {
  COD: codSettingsSchema,
}

export const paymentMethodUpdateSchema = z.object({
  id: z.string().optional(),
  provider: paymentProvider,
  displayName: z.string().min(1),
  enabled: z.boolean(),
  mode: paymentMode.optional().default("SANDBOX"),
  supportsFullPayment: z.boolean().optional().default(false),
  supportsPartialPayment: z.boolean().optional().default(false),
  supportsCodDeliveryCharge: z.boolean().optional().default(false),
  instructions: z.string().optional().default(""),
  credentials: z.record(z.string(), z.any()).optional().default({}),
})

export const sizeChartSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  rows: z.array(z.object({
    label: z.string().min(1),
    position: z.number().int().default(0),
    measurements: z.record(z.string(), z.number()),
  })).optional(),
})

export const sizeChartUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  rows: z.array(z.object({
    id: z.string().optional(),
    label: z.string().min(1),
    position: z.number().int().default(0),
    measurements: z.record(z.string(), z.number()),
  })).optional(),
})

export const storySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  image: z.string().optional(),
  status: z.enum(["draft", "active"]).default("draft"),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoImage: z.string().optional(),
  seoKeywords: z.string().optional(),
})

const RESERVED_SLUGS = [
  "admin", "api", "account", "auth", "checkout", "cart",
  "products", "stories", "p", "l", "go", "feed",
  "order", "search", "track-order",
]

export const shortLinkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens only")
    .refine((val) => !RESERVED_SLUGS.includes(val), "This slug is reserved"),
  destinationUrl: z.string().min(1, "Destination URL is required"),
  type: z.enum(["internal", "external"]).default("internal"),
  status: z.enum(["active", "inactive"]).default("active"),
  utmSource: z.string().optional().or(z.literal("")),
  utmMedium: z.string().optional().or(z.literal("")),
  utmCampaign: z.string().optional().or(z.literal("")),
  nofollow: z.boolean().optional().default(false),
  expiresAt: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.type === "internal") return data.destinationUrl.startsWith("/")
    return data.destinationUrl.startsWith("http://") || data.destinationUrl.startsWith("https://")
  },
  { message: "Internal URLs must start with / and external URLs must start with http:// or https://" },
)
