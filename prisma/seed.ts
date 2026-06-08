import { prisma } from "../lib/prisma"
import { hash } from "bcryptjs"

function localProductImage(label: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e5e7eb"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1100" fill="url(#bg)"/>
      <circle cx="720" cy="190" r="130" fill="${accent}" opacity="0.16"/>
      <circle cx="170" cy="900" r="180" fill="${accent}" opacity="0.12"/>
      <rect x="210" y="210" width="480" height="610" rx="70" fill="#ffffff" stroke="#d1d5db" stroke-width="4"/>
      <path d="M340 265h220l80 150-72 48-36-68v330H368V395l-36 68-72-48 80-150z" fill="${accent}" opacity="0.82"/>
      <path d="M368 395h164v330H368z" fill="#111827" opacity="0.08"/>
      <text x="450" y="905" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">DOSHOK</text>
      <text x="450" y="955" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">${label}</text>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

async function main() {
  const adminPassword = await hash("admin123", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@doshok.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@doshok.com",
      password: adminPassword,
      role: "admin",
    },
  })
  console.log("Admin created:", admin.email)

  const seedCategories = [
    { name: "Panjabi", slug: "panjabi" },
    { name: "Shirt", slug: "shirt" },
    { name: "Kurta", slug: "kurta" },
    { name: "Saree", slug: "saree" },
    { name: "Three Piece", slug: "three-piece" },
    { name: "Co-ord Sets", slug: "coord-sets" },
    { name: "Tops", slug: "tops" },
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
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))
  const categoryId = (slug: string) => {
    const category = categoryBySlug.get(slug)
    if (!category) throw new Error(`Missing seed category: ${slug}`)
    return category.id
  }

  console.log("Categories seeded:", categories.length)

  const products = [
    {
      name: "Premium Cotton Panjabi",
      slug: "premium-cotton-panjabi",
      description: "High-quality cotton panjabi, perfect for Eid and special occasions.",
      price: 2490,
      oldPrice: 2990,
      images: [],
      categoryId: categoryId("panjabi"),
      featured: true,
      variants: [
        { size: "M", color: "White", colorHex: "#FFFFFF", stock: 20 },
        { size: "L", color: "White", colorHex: "#FFFFFF", stock: 30 },
        { size: "XL", color: "White", colorHex: "#FFFFFF", stock: 25 },
        { size: "M", color: "Black", colorHex: "#000000", stock: 15 },
        { size: "L", color: "Black", colorHex: "#000000", stock: 20 },
        { size: "XL", color: "Black", colorHex: "#000000", stock: 10 },
      ],
    },
    {
      name: "Slim Fit Formal Shirt",
      slug: "slim-fit-formal-shirt",
      description: "Modern slim fit formal shirt for office and events.",
      price: 1890,
      oldPrice: 2290,
      images: [],
      categoryId: categoryId("shirt"),
      featured: true,
      variants: [
        { size: "M", color: "Blue", colorHex: "#0000FF", stock: 25 },
        { size: "L", color: "Blue", colorHex: "#0000FF", stock: 35 },
        { size: "XL", color: "Blue", colorHex: "#0000FF", stock: 20 },
        { size: "M", color: "White", colorHex: "#FFFFFF", stock: 30 },
        { size: "L", color: "White", colorHex: "#FFFFFF", stock: 40 },
      ],
    },
    {
      name: "Embroidered Kurta",
      slug: "embroidered-kurta",
      description: "Beautiful embroidered kurta with traditional designs.",
      price: 3490,
      oldPrice: null,
      images: [],
      categoryId: categoryId("kurta"),
      featured: true,
      variants: [
        { size: "M", color: "Maroon", colorHex: "#800000", stock: 15 },
        { size: "L", color: "Maroon", colorHex: "#800000", stock: 20 },
        { size: "XL", color: "Maroon", colorHex: "#800000", stock: 12 },
        { size: "M", color: "Green", colorHex: "#008000", stock: 10 },
        { size: "L", color: "Green", colorHex: "#008000", stock: 18 },
      ],
    },
    {
      name: "Noor Soft Cotton Saree",
      slug: "noor-soft-cotton-saree",
      description: "A lightweight everyday saree with a soft drape and understated border detailing.",
      price: 2850,
      oldPrice: 3450,
      images: [localProductImage("Soft Cotton Saree", "#9f1239")],
      categoryId: categoryId("saree"),
      featured: true,
      variants: [
        { size: "Free Size", color: "Rose", colorHex: "#be123c", stock: 18 },
        { size: "Free Size", color: "Ivory", colorHex: "#f8fafc", stock: 14 },
      ],
    },
    {
      name: "Meghna Linen Blend Saree",
      slug: "meghna-linen-blend-saree",
      description: "An airy linen blend saree designed for warm days and refined occasions.",
      price: 3290,
      oldPrice: 3890,
      images: [localProductImage("Linen Saree", "#475569")],
      categoryId: categoryId("saree"),
      featured: true,
      variants: [
        { size: "Free Size", color: "Slate", colorHex: "#475569", stock: 20 },
        { size: "Free Size", color: "Sand", colorHex: "#d6d3d1", stock: 12 },
      ],
    },
    {
      name: "Aarshi Festive Jamdani Saree",
      slug: "aarshi-festive-jamdani-saree",
      description: "A statement saree inspired by traditional motifs with a polished festive finish.",
      price: 5890,
      oldPrice: 6590,
      images: [localProductImage("Jamdani Saree", "#7c2d12")],
      categoryId: categoryId("saree"),
      featured: false,
      variants: [
        { size: "Free Size", color: "Copper", colorHex: "#b45309", stock: 9 },
        { size: "Free Size", color: "Black", colorHex: "#111827", stock: 7 },
      ],
    },
    {
      name: "Dhara Printed Georgette Saree",
      slug: "dhara-printed-georgette-saree",
      description: "A fluid printed saree with easy movement and a clean modern palette.",
      price: 2450,
      oldPrice: 2990,
      images: [localProductImage("Georgette Saree", "#0f766e")],
      categoryId: categoryId("saree"),
      featured: false,
      variants: [
        { size: "Free Size", color: "Teal", colorHex: "#0f766e", stock: 16 },
        { size: "Free Size", color: "Cream", colorHex: "#fef3c7", stock: 10 },
      ],
    },
    {
      name: "Maya Embroidered Three Piece",
      slug: "maya-embroidered-three-piece",
      description: "A comfortable three piece set with delicate embroidery and a graceful silhouette.",
      price: 3690,
      oldPrice: 4290,
      images: [localProductImage("Embroidered Set", "#9333ea")],
      categoryId: categoryId("three-piece"),
      featured: true,
      variants: [
        { size: "M", color: "Lavender", colorHex: "#c084fc", stock: 15 },
        { size: "L", color: "Lavender", colorHex: "#c084fc", stock: 18 },
        { size: "XL", color: "Lavender", colorHex: "#c084fc", stock: 10 },
      ],
    },
    {
      name: "Tara Daily Wear Three Piece",
      slug: "tara-daily-wear-three-piece",
      description: "A breathable daily wear set with a relaxed fit and soft hand feel.",
      price: 2490,
      oldPrice: 2990,
      images: [localProductImage("Daily Three Piece", "#2563eb")],
      categoryId: categoryId("three-piece"),
      featured: false,
      variants: [
        { size: "M", color: "Blue", colorHex: "#2563eb", stock: 22 },
        { size: "L", color: "Blue", colorHex: "#2563eb", stock: 20 },
        { size: "XL", color: "Blue", colorHex: "#2563eb", stock: 13 },
      ],
    },
    {
      name: "Nira Printed Lawn Three Piece",
      slug: "nira-printed-lawn-three-piece",
      description: "A printed lawn set for easy styling through weekday and weekend plans.",
      price: 2190,
      oldPrice: 2690,
      images: [localProductImage("Printed Lawn Set", "#16a34a")],
      categoryId: categoryId("three-piece"),
      featured: false,
      variants: [
        { size: "S", color: "Green", colorHex: "#16a34a", stock: 14 },
        { size: "M", color: "Green", colorHex: "#16a34a", stock: 19 },
        { size: "L", color: "Green", colorHex: "#16a34a", stock: 16 },
      ],
    },
    {
      name: "Ira Premium Muslin Three Piece",
      slug: "ira-premium-muslin-three-piece",
      description: "A premium muslin set with a refined texture and occasion-ready finish.",
      price: 4490,
      oldPrice: 5290,
      images: [localProductImage("Muslin Three Piece", "#be185d")],
      categoryId: categoryId("three-piece"),
      featured: true,
      variants: [
        { size: "M", color: "Plum", colorHex: "#be185d", stock: 11 },
        { size: "L", color: "Plum", colorHex: "#be185d", stock: 9 },
        { size: "XL", color: "Plum", colorHex: "#be185d", stock: 8 },
      ],
    },
    {
      name: "Urban Ease Co-ord Set",
      slug: "urban-ease-coord-set",
      description: "A minimal co-ord set made for relaxed days, quick outings, and easy layering.",
      price: 2790,
      oldPrice: 3290,
      images: [localProductImage("Urban Co-ord", "#334155")],
      categoryId: categoryId("coord-sets"),
      featured: true,
      variants: [
        { size: "S", color: "Charcoal", colorHex: "#334155", stock: 12 },
        { size: "M", color: "Charcoal", colorHex: "#334155", stock: 21 },
        { size: "L", color: "Charcoal", colorHex: "#334155", stock: 17 },
      ],
    },
    {
      name: "Weekend Linen Co-ord Set",
      slug: "weekend-linen-coord-set",
      description: "A crisp linen-look co-ord for effortless warm-weather styling.",
      price: 3190,
      oldPrice: 3790,
      images: [localProductImage("Linen Co-ord", "#a16207")],
      categoryId: categoryId("coord-sets"),
      featured: false,
      variants: [
        { size: "S", color: "Mustard", colorHex: "#ca8a04", stock: 8 },
        { size: "M", color: "Mustard", colorHex: "#ca8a04", stock: 15 },
        { size: "L", color: "Mustard", colorHex: "#ca8a04", stock: 12 },
      ],
    },
    {
      name: "Monochrome Lounge Co-ord",
      slug: "monochrome-lounge-coord",
      description: "A soft monochrome set with clean lines and all-day comfort.",
      price: 2590,
      oldPrice: null,
      images: [localProductImage("Lounge Co-ord", "#111827")],
      categoryId: categoryId("coord-sets"),
      featured: false,
      variants: [
        { size: "M", color: "Black", colorHex: "#111827", stock: 20 },
        { size: "L", color: "Black", colorHex: "#111827", stock: 16 },
        { size: "XL", color: "Black", colorHex: "#111827", stock: 10 },
      ],
    },
    {
      name: "Pastel Day Out Co-ord",
      slug: "pastel-day-out-coord",
      description: "A pastel co-ord set with a fresh tone and relaxed contemporary shape.",
      price: 2990,
      oldPrice: 3490,
      images: [localProductImage("Pastel Co-ord", "#db2777")],
      categoryId: categoryId("coord-sets"),
      featured: true,
      variants: [
        { size: "S", color: "Pink", colorHex: "#f9a8d4", stock: 13 },
        { size: "M", color: "Pink", colorHex: "#f9a8d4", stock: 18 },
        { size: "L", color: "Pink", colorHex: "#f9a8d4", stock: 9 },
      ],
    },
    {
      name: "Essential Ribbed Top",
      slug: "essential-ribbed-top",
      description: "A fitted ribbed top for pairing with jeans, skirts, and layering pieces.",
      price: 990,
      oldPrice: 1290,
      images: [localProductImage("Ribbed Top", "#0f172a")],
      categoryId: categoryId("tops"),
      featured: false,
      variants: [
        { size: "S", color: "Black", colorHex: "#0f172a", stock: 28 },
        { size: "M", color: "Black", colorHex: "#0f172a", stock: 32 },
        { size: "L", color: "Black", colorHex: "#0f172a", stock: 18 },
      ],
    },
    {
      name: "Soft Modal Everyday Top",
      slug: "soft-modal-everyday-top",
      description: "A smooth modal top with a relaxed cut for everyday styling.",
      price: 1190,
      oldPrice: 1490,
      images: [localProductImage("Modal Top", "#0891b2")],
      categoryId: categoryId("tops"),
      featured: true,
      variants: [
        { size: "S", color: "Cyan", colorHex: "#06b6d4", stock: 19 },
        { size: "M", color: "Cyan", colorHex: "#06b6d4", stock: 26 },
        { size: "L", color: "Cyan", colorHex: "#06b6d4", stock: 14 },
      ],
    },
    {
      name: "Boxy Cotton Shirt Top",
      slug: "boxy-cotton-shirt-top",
      description: "A boxy shirt-style top with breathable cotton comfort and a modern profile.",
      price: 1590,
      oldPrice: 1990,
      images: [localProductImage("Cotton Shirt Top", "#4f46e5")],
      categoryId: categoryId("tops"),
      featured: false,
      variants: [
        { size: "S", color: "Indigo", colorHex: "#4f46e5", stock: 15 },
        { size: "M", color: "Indigo", colorHex: "#4f46e5", stock: 22 },
        { size: "L", color: "Indigo", colorHex: "#4f46e5", stock: 11 },
      ],
    },
    {
      name: "Pleated Sleeve Occasion Top",
      slug: "pleated-sleeve-occasion-top",
      description: "An elevated top with pleated sleeves for dinners, events, and refined outings.",
      price: 1890,
      oldPrice: 2290,
      images: [localProductImage("Occasion Top", "#7e22ce")],
      categoryId: categoryId("tops"),
      featured: true,
      variants: [
        { size: "S", color: "Purple", colorHex: "#7e22ce", stock: 10 },
        { size: "M", color: "Purple", colorHex: "#7e22ce", stock: 14 },
        { size: "L", color: "Purple", colorHex: "#7e22ce", stock: 8 },
      ],
    },
    {
      name: "Minimal Everyday Tote",
      slug: "minimal-everyday-tote",
      description: "A structured tote for daily essentials with a polished minimal finish.",
      price: 1750,
      oldPrice: 2190,
      images: [localProductImage("Everyday Tote", "#57534e")],
      categoryId: categoryId("accessories"),
      featured: false,
      variants: [
        { size: "Regular", color: "Taupe", colorHex: "#78716c", stock: 18 },
        { size: "Regular", color: "Black", colorHex: "#111827", stock: 16 },
      ],
    },
    {
      name: "Pearl Accent Hijab Pin Set",
      slug: "pearl-accent-hijab-pin-set",
      description: "A refined pin set with pearl accents for clean and secure styling.",
      price: 590,
      oldPrice: 790,
      images: [localProductImage("Hijab Pin Set", "#64748b")],
      categoryId: categoryId("accessories"),
      featured: false,
      variants: [
        { size: "Set of 6", color: "Pearl", colorHex: "#f8fafc", stock: 35 },
        { size: "Set of 6", color: "Silver", colorHex: "#cbd5e1", stock: 30 },
      ],
    },
    {
      name: "Classic Woven Scarf",
      slug: "classic-woven-scarf",
      description: "A soft woven scarf with a versatile texture for daily styling.",
      price: 890,
      oldPrice: 1090,
      images: [localProductImage("Woven Scarf", "#0d9488")],
      categoryId: categoryId("accessories"),
      featured: true,
      variants: [
        { size: "Free Size", color: "Teal", colorHex: "#0d9488", stock: 21 },
        { size: "Free Size", color: "Beige", colorHex: "#e7e5e4", stock: 17 },
      ],
    },
    {
      name: "Slim Statement Belt",
      slug: "slim-statement-belt",
      description: "A slim belt designed to define outfits with a subtle statement detail.",
      price: 990,
      oldPrice: null,
      images: [localProductImage("Statement Belt", "#92400e")],
      categoryId: categoryId("accessories"),
      featured: false,
      variants: [
        { size: "M", color: "Brown", colorHex: "#92400e", stock: 12 },
        { size: "L", color: "Brown", colorHex: "#92400e", stock: 10 },
        { size: "M", color: "Black", colorHex: "#111827", stock: 14 },
      ],
    },
  ]

  for (const product of products) {
    const { variants, ...data } = product
    await prisma.product.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        description: data.description,
        price: data.price,
        oldPrice: data.oldPrice,
        images: data.images,
        categoryId: data.categoryId,
        featured: data.featured,
        published: true,
      },
      create: {
        ...data,
        variants: {
          create: variants,
        },
      },
    })
  }
  console.log("Products created:", products.length)

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

  await prisma.homepageConfig.upsert({
    where: { id: "homepage" },
    update: {},
    create: {
      id: "homepage",
      heroTitle: "Doshok — Style That Speaks",
      heroSubtitle: "Premium Bangladeshi fashion for the modern wardrobe.",
      heroImage: null,
      featuredIds: "[]",
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
    { provider: "ROCKET", displayName: "Rocket", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay securely with Rocket." },
    { provider: "UPAY", displayName: "Upay", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay securely with Upay." },
    { provider: "SSLCOMMERZ", displayName: "SSLCommerz", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay via SSLCommerz." },
    { provider: "AAMARPAY", displayName: "aamarPay", enabled: false, mode: "SANDBOX", supportsFullPayment: true, supportsPartialPayment: true, supportsCodDeliveryCharge: false, instructions: "Pay via aamarPay." },
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
