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
  price: z.number().positive(),
  oldPrice: z.number().positive().optional(),
  images: z.array(z.string()).default([]),
  categoryId: z.string().min(1),
  featured: z.boolean().default(false),
  status: z.enum(["Draft", "Active", "Hidden", "Archived"]).default("Draft"),
  pageType: z.enum(["NORMAL", "LANDING"]).default("NORMAL"),
  defaultCouponCode: z.string().optional(),
  landingHeadline: z.string().optional(),
  landingSubheadline: z.string().optional(),
  landingCopy: z.string().optional(),
  landingHeroImage: z.string().optional(),
  variants: z.array(z.object({
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().optional(),
    stock: z.number().int().nonnegative().default(0),
    sku: z.string().optional(),
  })).optional(),
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
})

export const addressSchema = z.object({
  label: z.enum(["Home", "Office", "Family", "Other"]).default("Home"),
  recipientName: z.string().min(1, "Recipient name is required").max(100),
  phone: z.string().min(11, "Valid phone number is required").max(20),
  addressLine1: z.string().min(1, "Address is required").max(500),
  addressLine2: z.string().max(500).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100),
  zone: z.enum(["chatto", "dhaka", "outside"]),
  postalCode: z.string().max(20).optional().or(z.literal("")),
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
  phoneVerifiedToken: z.string().min(1, "Phone verification is required"),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
})

export const couponValidateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
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
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
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
})

export const otpSchema = z.object({
  phone: z.string().min(11),
  code: z.string().length(6),
})

export const paymentProvider = z.enum([
  "BKASH", "NAGAD", "ROCKET", "UPAY", "SSLCOMMERZ", "AAMARPAY", "COD",
])

export const paymentMode = z.enum(["SANDBOX", "LIVE"])

export const bkashCredentialsSchema = z.object({
  merchantNumber: z.string().optional().default(""),
  appKey: z.string().optional().default(""),
  appSecret: z.string().optional().default(""),
  username: z.string().optional().default(""),
  password: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  callbackUrl: z.string().optional().default(""),
})

export const nagadCredentialsSchema = z.object({
  merchantId: z.string().optional().default(""),
  merchantNumber: z.string().optional().default(""),
  publicKey: z.string().optional().default(""),
  privateKey: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  callbackUrl: z.string().optional().default(""),
})

export const rocketCredentialsSchema = z.object({
  merchantId: z.string().optional().default(""),
  merchantNumber: z.string().optional().default(""),
  secretKey: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  callbackUrl: z.string().optional().default(""),
})

export const upayCredentialsSchema = z.object({
  merchantId: z.string().optional().default(""),
  merchantNumber: z.string().optional().default(""),
  appKey: z.string().optional().default(""),
  appSecret: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  callbackUrl: z.string().optional().default(""),
})

export const sslcommerzCredentialsSchema = z.object({
  storeId: z.string().optional().default(""),
  storePassword: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  successUrl: z.string().optional().default(""),
  failUrl: z.string().optional().default(""),
  cancelUrl: z.string().optional().default(""),
  ipnUrl: z.string().optional().default(""),
})

export const aamarpayCredentialsSchema = z.object({
  storeId: z.string().optional().default(""),
  signatureKey: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  successUrl: z.string().optional().default(""),
  failUrl: z.string().optional().default(""),
  cancelUrl: z.string().optional().default(""),
})

export const codSettingsSchema = z.object({
  deliveryChargePrepayRequired: z.boolean().optional().default(false),
})

export const providerCredentialsMap: Record<string, z.ZodTypeAny> = {
  BKASH: bkashCredentialsSchema,
  NAGAD: nagadCredentialsSchema,
  ROCKET: rocketCredentialsSchema,
  UPAY: upayCredentialsSchema,
  SSLCOMMERZ: sslcommerzCredentialsSchema,
  AAMARPAY: aamarpayCredentialsSchema,
  COD: codSettingsSchema,
}

export const courierProvider = z.enum(["PATHAO", "STEADFAST", "REDX"])

export const courierMode = z.enum(["SANDBOX", "LIVE"])

export const shipmentStatus = z.enum([
  "NOT_CREATED",
  "SETUP_READY",
  "PENDING",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
])

export const pathaoCredentialsSchema = z.object({
  clientId: z.string().optional().default(""),
  clientSecret: z.string().optional().default(""),
  username: z.string().optional().default(""),
  password: z.string().optional().default(""),
  storeId: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
})

export const steadfastCredentialsSchema = z.object({
  apiKey: z.string().optional().default(""),
  secretKey: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
})

export const redxCredentialsSchema = z.object({
  apiToken: z.string().optional().default(""),
  baseUrl: z.string().optional().default(""),
  storeId: z.string().optional().default(""),
})

export const courierCredentialsMap: Record<string, z.ZodTypeAny> = {
  PATHAO: pathaoCredentialsSchema,
  STEADFAST: steadfastCredentialsSchema,
  REDX: redxCredentialsSchema,
}

export const courierMethodUpdateSchema = z.object({
  id: z.string().optional(),
  provider: courierProvider,
  displayName: z.string().min(1),
  enabled: z.boolean(),
  mode: courierMode,
  isDefault: z.boolean(),
  instructions: z.string().optional().default(""),
  pickupName: z.string().optional().default(""),
  pickupPhone: z.string().optional().default(""),
  pickupAddress: z.string().optional().default(""),
  pickupCity: z.string().optional().default(""),
  pickupZone: z.string().optional().default(""),
  credentials: z.record(z.string(), z.any()).optional().default({}),
})

export const shipmentCreateSchema = z.object({
  courierProvider: courierProvider,
  customerNote: z.string().optional().default(""),
  adminNote: z.string().optional().default(""),
  cityId: z.string().optional().default(""),
  areaId: z.string().optional().default(""),
})

export const shipmentUpdateSchema = z.object({
  status: shipmentStatus.optional(),
  trackingCode: z.string().optional(),
  consignmentId: z.string().optional(),
  customerNote: z.string().optional(),
  adminNote: z.string().optional(),
  courierProvider: courierProvider.optional(),
})

export const paymentMethodUpdateSchema = z.object({
  id: z.string().optional(),
  provider: paymentProvider,
  displayName: z.string().min(1),
  enabled: z.boolean(),
  mode: paymentMode,
  supportsFullPayment: z.boolean(),
  supportsPartialPayment: z.boolean(),
  supportsCodDeliveryCharge: z.boolean(),
  instructions: z.string().optional().default(""),
  credentials: z.record(z.string(), z.any()).optional().default({}),
})
