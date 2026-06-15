import { prisma } from "../lib/prisma"

async function main() {
  console.log("=== Doshok Demo Data Cleanup ===\n")

  // -------------------------------------------------------
  // 1. Count rows before deletion
  // -------------------------------------------------------
  const countsBefore = {
    orderItems: await prisma.orderItem.count(),
    addresses: await prisma.address.count(),
    orders: await prisma.order.count(),
    productVariants: await prisma.productVariant.count(),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    coupons: await prisma.coupon.count(),
    otpVerifications: await prisma.otpVerification.count(),
    abandonedCheckouts: await prisma.abandonedCheckout.count(),
    sessions: await prisma.session.count(),
    accounts: await prisma.account.count(),
    users: await prisma.user.count(),
    deliveryZones: await prisma.deliveryZone.count(),
    siteSettings: await prisma.siteSettings.count(),
    homepageConfigs: await prisma.homepageConfig.count(),
    paymentMethodSettings: await prisma.paymentMethodSetting.count(),
  }

  // -------------------------------------------------------
  // 2. Delete dependent/commerce data in FK-safe order
  // -------------------------------------------------------
  console.log("Deleting order items...")
  const deletedOrderItems = await prisma.orderItem.deleteMany()
  console.log(`  -> ${deletedOrderItems.count} deleted`)

  console.log("Deleting addresses...")
  const deletedAddresses = await prisma.address.deleteMany()
  console.log(`  -> ${deletedAddresses.count} deleted`)

  console.log("Deleting orders...")
  const deletedOrders = await prisma.order.deleteMany()
  console.log(`  -> ${deletedOrders.count} deleted`)

  console.log("Deleting product variants...")
  const deletedVariants = await prisma.productVariant.deleteMany()
  console.log(`  -> ${deletedVariants.count} deleted`)

  console.log("Deleting products...")
  const deletedProducts = await prisma.product.deleteMany()
  console.log(`  -> ${deletedProducts.count} deleted`)

  console.log("Deleting categories...")
  const deletedCategories = await prisma.category.deleteMany()
  console.log(`  -> ${deletedCategories.count} deleted`)

  console.log("Deleting coupons...")
  const deletedCoupons = await prisma.coupon.deleteMany()
  console.log(`  -> ${deletedCoupons.count} deleted`)

  console.log("Deleting OTP verifications...")
  const deletedOtps = await prisma.otpVerification.deleteMany()
  console.log(`  -> ${deletedOtps.count} deleted`)

  console.log("Deleting abandoned checkouts...")
  const deletedAbandoned = await prisma.abandonedCheckout.deleteMany()
  console.log(`  -> ${deletedAbandoned.count} deleted`)

  // Delete auth sessions and accounts (but keep users)
  console.log("Deleting sessions...")
  const deletedSessions = await prisma.session.deleteMany()
  console.log(`  -> ${deletedSessions.count} deleted`)

  console.log("Deleting accounts...")
  const deletedAccounts = await prisma.account.deleteMany()
  console.log(`  -> ${deletedAccounts.count} deleted`)

  // -------------------------------------------------------
  // 3. Preserve / reset system data
  // -------------------------------------------------------

  // 3a. Verify admin user exists
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
  })
  if (adminUser) {
    console.log(`\nAdmin user kept: ${adminUser.email} (${adminUser.id})`)
  } else {
    console.log("\nWARNING: No admin user found. The seed script can recreate one.")
  }

  // 3b. Reset homepage featuredIds and sections
  console.log("\nResetting homepage config...")
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
    update: { featuredIds: "[]", sections: defaultSections },
    create: {
      id: "homepage",
      heroTitle: "Doshok — Style That Speaks",
      heroSubtitle: "Premium Bangladeshi fashion for the modern wardrobe.",
      heroImage: null,
      featuredIds: "[]",
      sections: defaultSections,
    },
  })
  console.log("  -> featuredIds and sections reset to defaults")

  // 3c. Ensure clean delivery zones
  const requiredZones = [
    { name: "Inside Chattogram", fee: 60 },
    { name: "Dhaka", fee: 100 },
    { name: "Outside Dhaka", fee: 130 },
  ]

  console.log("\nEnsuring delivery zones...")
  for (const zone of requiredZones) {
    await prisma.deliveryZone.upsert({
      where: { name: zone.name },
      update: { fee: zone.fee },
      create: zone,
    })
  }
  const zoneCount = await prisma.deliveryZone.count()
  console.log(`  -> ${zoneCount} delivery zone(s) present`)

  // 3d. Ensure payment method settings exist
  const requiredPaymentMethods = [
    { provider: "COD", displayName: "Cash on Delivery", enabled: true, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: false, supportsCodDeliveryCharge: false, instructions: "Pay when you receive your order." },
    { provider: "BKASH", displayName: "bKash", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay securely with bKash." },
    { provider: "NAGAD", displayName: "Nagad", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay securely with Nagad." },
  ]

  console.log("\nEnsuring payment method settings...")
  for (const pm of requiredPaymentMethods) {
    await prisma.paymentMethodSetting.upsert({
      where: { provider: pm.provider },
      update: { ...pm, credentialsJson: null },
      create: { ...pm, credentialsJson: null },
    })
  }
  const pmCount = await prisma.paymentMethodSetting.count()
  console.log(`  -> ${pmCount} payment method setting(s) present`)

  // 3e. Ensure site settings default exists
  console.log("\nEnsuring site settings...")
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      brandName: "DOSHOK",
      supportEmail: "hello@doshok.com",
      phone: "",
      address: "We deliver across all districts of Bangladesh. Our operation hub is in Chattogram.",
      footerText: "Premium Bangladeshi fashion for the modern wardrobe.",
    },
  })
  console.log("  -> Site settings default present")

  // -------------------------------------------------------
  // 4. Summary
  // -------------------------------------------------------
  console.log("\n=== Cleanup Summary ===")
  console.log(`Order items deleted:      ${countsBefore.orderItems} -> 0`)
  console.log(`Addresses deleted:        ${countsBefore.addresses} -> 0`)
  console.log(`Orders deleted:           ${countsBefore.orders} -> 0`)
  console.log(`Product variants deleted: ${countsBefore.productVariants} -> 0`)
  console.log(`Products deleted:         ${countsBefore.products} -> 0`)
  console.log(`Categories deleted:       ${countsBefore.categories} -> 0`)
  console.log(`Coupons deleted:          ${countsBefore.coupons} -> 0`)
  console.log(`OTP records deleted:      ${countsBefore.otpVerifications} -> 0`)
  console.log(`Abandoned checkouts:      ${countsBefore.abandonedCheckouts} -> 0`)
  console.log(`Sessions deleted:         ${countsBefore.sessions} -> 0`)
  console.log(`Accounts deleted:         ${countsBefore.accounts} -> 0`)

  const keptUsers = await prisma.user.count()
  console.log(`\nKept:`)
  console.log(`  Admin users:            ${keptUsers}`)
  console.log(`  Site settings:          ${await prisma.siteSettings.count()}`)
  console.log(`  Homepage config:        ${await prisma.homepageConfig.count()}`)
  console.log(`  Delivery zones:         ${await prisma.deliveryZone.count()}`)
  console.log(`  Payment methods:        ${await prisma.paymentMethodSetting.count()}`)

  console.log("\n=== Cleanup complete ===")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Cleanup failed:", e)
    process.exit(1)
  })
