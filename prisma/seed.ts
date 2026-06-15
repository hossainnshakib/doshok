import { prisma } from "../lib/prisma"
import { hash } from "bcryptjs"

async function main() {
  const adminPassword = await hash("admin123", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@doshok.com" },
    update: {
      role: "admin",
      name: "Admin",
    },
    create: {
      name: "Admin",
      email: "admin@doshok.com",
      password: adminPassword,
      role: "admin",
    },
  })
  console.log("Admin created:", admin.email)

  const seedCategories = [
    { name: "Three Piece", slug: "three-piece" },
    { name: "Kurti", slug: "kurti" },
    { name: "Abaya", slug: "abaya" },
    { name: "Saree", slug: "saree" },
    { name: "Co-Ord Set", slug: "coord-set" },
    { name: "Shawl", slug: "shawl" },
    { name: "Accessories", slug: "accessories" },
  ]

  const categories = await Promise.all(
    seedCategories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: { ...category, image: null },
      })
    )
  )

  console.log("Categories seeded:", categories.length)

  console.log("Skipping demo products — add real products via admin panel.")

  const deliveryZones = [
    { name: "Inside Chattogram", fee: 60 },
    { name: "Dhaka", fee: 100 },
    { name: "Outside Dhaka", fee: 130 },
  ]

  for (const zone of deliveryZones) {
    await prisma.deliveryZone.upsert({
      where: { name: zone.name },
      update: {},
      create: zone,
    })
  }
  console.log("Delivery zones created:", deliveryZones.length)

  const defaultSections = JSON.stringify([
    { type: "hero", enabled: true, title: "", description: "", sortOrder: 0, config: {} },
    { type: "categories", enabled: true, title: "Shop by Category", description: "", sortOrder: 10, config: { maxCategories: 8 } },
    { type: "sale_products", enabled: true, title: "Special Discount", description: "", sortOrder: 20, config: { maxProducts: 4 } },
    { type: "new_arrivals", enabled: true, title: "New Arrivals", description: "", sortOrder: 30, config: { maxProducts: 8 } },
    { type: "featured_products", enabled: true, title: "Doshok Picks", description: "Curated sets for daily elegance and effortless style.", sortOrder: 40, config: { maxProducts: 4 } },
    { type: "promo_banner", enabled: true, title: "", description: "", sortOrder: 50, config: {} },
    { type: "quote", enabled: true, title: "Style That Speaks", description: "", sortOrder: 60, config: {} },
  ])

  await prisma.homepageConfig.upsert({
    where: { id: "homepage" },
    update: { sections: defaultSections },
    create: {
      id: "homepage",
      heroTitle: "Doshok — Style That Speaks",
      heroSubtitle: "Premium Bangladeshi fashion for the modern wardrobe.",
      heroImage: null,
      featuredIds: "[]",
      sections: defaultSections,
    },
  })
  console.log("Homepage config created")

  const courierMethods = [
    { provider: "PATHAO", displayName: "Pathao", enabled: false, mode: "SANDBOX", isDefault: true, instructions: "Nationwide delivery via Pathao." },
    { provider: "STEADFAST", displayName: "Steadfast", enabled: false, mode: "SANDBOX", isDefault: false, instructions: "Reliable courier service across Bangladesh." },
    { provider: "REDX", displayName: "RedX", enabled: false, mode: "SANDBOX", isDefault: false, instructions: "E-commerce courier delivery service." },
  ]

  for (const cm of courierMethods) {
    await prisma.courierProviderSetting.upsert({
      where: { provider: cm.provider },
      update: {},
      create: cm,
    })
  }
  console.log("Courier methods seeded:", courierMethods.length)

  const paymentMethods = [
    { provider: "COD", displayName: "Cash on Delivery", enabled: true, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: false, supportsCodDeliveryCharge: false, instructions: "Pay when you receive your order." },
    { provider: "BKASH", displayName: "bKash", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay securely with bKash." },
    { provider: "NAGAD", displayName: "Nagad", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay securely with Nagad." },
  ]

  for (const pm of paymentMethods) {
    await prisma.paymentMethodSetting.upsert({
      where: { provider: pm.provider },
      update: {},
      create: pm,
    })
  }
  console.log("Payment methods seeded:", paymentMethods.length)
}

main()
  .then(() => {
    console.log("Seed complete")
    process.exit(0)
  })
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
