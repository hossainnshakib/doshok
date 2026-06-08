import type { InfoPageData } from "@/components/store/info-page"

const supportActions = [
  { label: "Shop Collection", href: "/products" },
  { label: "Track Order", href: "/track-order", variant: "secondary" as const },
]

export const aboutPage: InfoPageData = {
  eyebrow: "Our House",
  title: "A wardrobe built in Bangladesh.",
  description:
    "Doshok is a single-house fashion label crafting clean essentials, polished occasion pieces, and everyday comfort for modern Bangladeshi life.",
  actions: supportActions,
  stats: [
    { value: "New", label: "Launch styles" },
    { value: "7", label: "Categories" },
    { value: "100%", label: "Quality checked" },
  ],
  sections: [
    {
      id: "story",
      title: "Our Story",
      body: [
        "Doshok began with a simple belief: premium fashion should feel effortless, wearable, and made for the rhythm of Bangladesh.",
        "We curate versatile silhouettes, breathable fabrics, and careful finishing so every order feels intentional from first browse to doorstep delivery.",
      ],
    },
    {
      id: "values",
      title: "What We Stand For",
      cards: [
        { title: "Quiet Premium", body: "Clean design, strong proportions, and elevated basics that do not shout." },
        { title: "Local Rhythm", body: "Products, sizing, and delivery promises shaped around Bangladeshi customers." },
        { title: "Verified Checkout", body: "Simple COD-first purchasing with payment gateways kept setup-ready for growth." },
      ],
    },
    {
      id: "process",
      title: "Our Process",
      bullets: [
        "Select fabrics and silhouettes for comfort in local weather.",
        "Check product images, fit notes, stock, and pricing before publishing.",
        "Pack orders carefully and keep the customer informed after checkout.",
        "Improve collections using customer questions, exchanges, and feedback.",
      ],
    },
  ],
}

export const accessibilityPage: InfoPageData = {
  eyebrow: "Accessibility",
  title: "Shopping should be clear for everyone.",
  description:
    "We aim for a calm, keyboard-friendly, readable storefront with practical accessibility improvements across product discovery and checkout.",
  actions: [{ label: "Contact Support", href: "/contact" }],
  stats: [
    { value: "AA", label: "Target contrast standard" },
    { value: "Mobile", label: "First layout checks" },
    { value: "Ongoing", label: "Accessibility review" },
  ],
  sections: [
    {
      id: "commitment",
      title: "Our Commitment",
      body: [
        "Doshok works toward WCAG 2.2 AA aligned experiences where possible, with readable typography, clear forms, meaningful labels, and predictable navigation.",
      ],
    },
    {
      id: "included",
      title: "Already Prioritized",
      bullets: [
        "Visible focus states for interactive controls.",
        "Mobile layouts that avoid horizontal overflow.",
        "Plain-language content for policy and support pages.",
        "Form labels and validation messages for key checkout/support flows.",
      ],
    },
    {
      id: "feedback",
      title: "Found a Problem?",
      body: [
        "If any page, product, or checkout step is difficult to use, contact us with the page URL and your device details. We will review and prioritize a fix.",
      ],
    },
  ],
}

export const careGuidePage: InfoPageData = {
  eyebrow: "Care Guide",
  title: "Keep your pieces looking new.",
  description:
    "Practical care notes for cotton, linen, denim, knitwear, leather, and everyday Doshok wardrobe staples.",
  actions: [{ label: "Shop New Arrivals", href: "/new-arrivals" }],
  sections: [
    {
      id: "fabric",
      title: "Fabric Care",
      cards: [
        { title: "Cotton", body: "Wash cold with similar colors, reshape while damp, and avoid harsh bleach." },
        { title: "Linen", body: "Use gentle wash cycles and steam lightly for a relaxed, polished drape." },
        { title: "Wool & Merino", body: "Air between wears, hand wash when needed, and dry flat away from direct sun." },
        { title: "Denim", body: "Wash inside out, reduce frequent washing, and expect natural character over time." },
        { title: "Leather", body: "Wipe with a soft cloth and store away from moisture and direct heat." },
      ],
    },
    {
      id: "routine",
      title: "Everyday Routine",
      bullets: [
        "Close zippers and buttons before washing.",
        "Use mesh bags for delicate pieces.",
        "Dry in shade to protect color depth.",
        "Store structured garments on proper hangers.",
      ],
    },
  ],
}

export const careersPage: InfoPageData = {
  eyebrow: "Careers",
  title: "Build the next Doshok chapter.",
  description:
    "We are building a thoughtful fashion house across product, content, operations, customer care, and storefront engineering.",
  actions: [{ label: "Email Your CV", href: "mailto:careers@doshok.com" }],
  stats: [
    { value: "6", label: "Example roles" },
    { value: "Dhaka", label: "Hybrid base" },
    { value: "Growth", label: "Learning culture" },
  ],
  sections: [
    {
      id: "roles",
      title: "Open Role Examples",
      cards: [
        { title: "Senior Pattern Maker", body: "Guide fit, structure, grading, and sample refinement." },
        { title: "Brand Photographer", body: "Create editorial visuals for products, campaigns, and stories." },
        { title: "Customer Care Lead", body: "Own customer response quality, returns, exchanges, and order support." },
        { title: "Warehouse Associate", body: "Support inventory accuracy, packing, and dispatch readiness." },
        { title: "Frontend Engineer", body: "Improve the ecommerce experience with premium, fast UI." },
        { title: "Content Writer", body: "Shape product copy, buying guides, and brand storytelling." },
      ],
    },
    {
      id: "process",
      title: "Hiring Process",
      bullets: [
        "Portfolio or CV review.",
        "Short practical discussion or assignment.",
        "Team interview focused on craft and communication.",
        "Offer, onboarding, and clear first-month goals.",
      ],
    },
  ],
}

export const cookiesPage: InfoPageData = {
  eyebrow: "Cookies",
  title: "Small files, clearer shopping.",
  description:
    "This policy explains how Doshok uses cookies and similar storage to keep the site reliable, secure, and easier to use.",
  actions: [{ label: "Privacy Policy", href: "/privacy" }],
  sections: [
    {
      id: "uses",
      title: "How We Use Cookies",
      bullets: [
        "Remember cart and checkout session basics.",
        "Keep account and security flows reliable.",
        "Understand site performance and popular pages.",
        "Improve product discovery without selling personal data.",
      ],
    },
    {
      id: "types",
      title: "Cookie Types",
      table: {
        headers: ["Type", "Purpose", "Example"],
        rows: [
          ["Essential", "Required for cart, login, checkout, and security.", "Session token, cart id"],
          ["Preference", "Stores choices like region or display preferences.", "Saved location"],
          ["Analytics", "Helps us understand aggregate page usage.", "Page view event"],
        ],
      },
    },
    {
      id: "control",
      title: "Managing Cookies",
      body: [
        "You can block or delete cookies from your browser settings. Some checkout, cart, account, or order features may not work correctly without essential cookies.",
      ],
    },
  ],
}

export const faqPage: InfoPageData = {
  eyebrow: "Support",
  title: "Questions, answered simply.",
  description:
    "Find quick answers about orders, delivery, returns, payment, sizing, account support, and Doshok shopping basics.",
  actions: [{ label: "Contact Support", href: "/contact" }, { label: "Track Order", href: "/track-order", variant: "secondary" }],
  sections: [
    {
      id: "orders",
      title: "Orders",
      faqs: [
        { question: "How do I place an order?", answer: "Browse products, choose size and color, add to cart, then complete checkout with your delivery details." },
        { question: "Can I cancel an order?", answer: "You can request cancellation before dispatch. Once shipped, the return or exchange policy applies." },
        { question: "Where is my order number?", answer: "It appears on the confirmation page and can be used on the Track Order page with your phone number." },
      ],
    },
    {
      id: "shipping",
      title: "Shipping",
      faqs: [
        { question: "Where do you deliver?", answer: "Doshok delivers across Bangladesh, with faster service inside Chattogram and major city zones." },
        { question: "How long does delivery take?", answer: "Inside Chattogram usually takes 1–3 business days; other areas may take 2–7 business days depending on location." },
      ],
    },
    {
      id: "payment",
      title: "Payment",
      faqs: [
        { question: "Do you offer COD?", answer: "Yes. Cash on Delivery is supported for eligible orders." },
        { question: "Are online gateways live?", answer: "Payment gateways remain setup-ready or dummy unless activated later by admin configuration." },
      ],
    },
    {
      id: "returns",
      title: "Returns & Exchanges",
      faqs: [
        { question: "Can I exchange a size?", answer: "Yes, if the item is unworn, unwashed, tagged, and requested within the policy window." },
        { question: "What if the product is wrong or damaged?", answer: "Contact support quickly with photos and order details so we can verify and resolve it." },
      ],
    },
  ],
}

export const giftCardsPage: InfoPageData = {
  eyebrow: "Gift Cards",
  title: "A thoughtful Doshok gift.",
  description:
    "Give someone the freedom to choose their own wardrobe refresh, from everyday essentials to polished statement pieces.",
  actions: [{ label: "Contact to Purchase", href: "/contact" }],
  sections: [
    {
      id: "amounts",
      title: "Pick an Amount",
      cards: [
        { title: "৳1,000", body: "A small style treat for accessories or essentials." },
        { title: "৳2,500", body: "A flexible amount for new arrivals and daily pieces." },
        { title: "৳5,000", body: "A generous wardrobe refresh for premium selections." },
      ],
    },
    {
      id: "redeem",
      title: "How to Redeem",
      bullets: [
        "Share the gift card code at checkout or with support.",
        "Use the balance toward eligible Doshok products.",
        "Gift cards are not exchangeable for cash.",
      ],
    },
  ],
}

export const privacyPage: InfoPageData = {
  eyebrow: "Privacy",
  title: "Your data deserves careful handling.",
  description:
    "This policy explains what we collect, why we collect it, how we protect it, and how you can contact Doshok about privacy requests.",
  actions: [{ label: "Contact Support", href: "/contact" }],
  sections: [
    {
      id: "collect",
      title: "Information We Collect",
      bullets: [
        "Name, phone, email, delivery address, and order details.",
        "Cart, checkout, coupon, and order support activity.",
        "Device, browser, and basic analytics information.",
      ],
    },
    {
      id: "use",
      title: "How We Use It",
      bullets: [
        "Process orders, delivery, returns, exchanges, and support.",
        "Send order updates, OTP messages, and service notifications.",
        "Improve product selection, site speed, and customer experience.",
      ],
    },
    {
      id: "sharing",
      title: "Sharing & Retention",
      body: [
        "We share only what is needed with delivery, support, payment, hosting, and operational providers. We do not sell customer data.",
        "Order records are retained as needed for service, accounting, fraud prevention, and legal obligations.",
      ],
    },
  ],
}

export const returnsPage: InfoPageData = {
  eyebrow: "Returns",
  title: "Easy exchanges, clear rules.",
  description:
    "Doshok supports practical returns and exchanges for eligible items so online shopping feels safer and more confident.",
  actions: [{ label: "Contact Support", href: "/contact" }, { label: "Size Guide", href: "/size-guide", variant: "secondary" }],
  sections: [
    {
      id: "window",
      title: "Return Window",
      body: [
        "You can request an eligible return or exchange within 7 days of delivery. Items must be unworn, unwashed, unused, and returned with original tags and packaging where applicable.",
      ],
    },
    {
      id: "steps",
      title: "How It Works",
      bullets: [
        "Contact support with your order number and reason.",
        "Share photos if the product is wrong, damaged, or defective.",
        "Wait for approval and return instructions.",
        "Receive exchange, store credit, or refund after inspection.",
      ],
    },
    {
      id: "refunds",
      title: "Refund Timing",
      table: {
        headers: ["Method", "Timing", "Notes"],
        rows: [
          ["COD refund", "3–7 business days after approval", "Processed through agreed support channel"],
          ["Exchange", "Depends on stock and delivery zone", "Replacement dispatch after inspection"],
          ["Store credit", "Usually fastest", "Applied to future Doshok order"],
        ],
      },
    },
    {
      id: "excluded",
      title: "Not Eligible",
      bullets: [
        "Washed, worn, scented, altered, or damaged by customer handling.",
        "Missing tags, packaging, or accessories.",
        "Final-sale or hygiene-sensitive items when marked non-returnable.",
      ],
    },
  ],
}

export const shippingPage: InfoPageData = {
  eyebrow: "Shipping",
  title: "Reliable delivery across Bangladesh.",
  description:
    "See delivery timelines, fees, packaging notes, and tracking guidance for Doshok orders.",
  actions: [{ label: "Track Order", href: "/track-order" }, { label: "Contact Support", href: "/contact", variant: "secondary" }],
  sections: [
    {
      id: "times",
      title: "Delivery Times",
      table: {
        headers: ["Zone", "Estimated Time", "Notes"],
        rows: [
          ["Inside Chattogram", "1–3 business days", "Fast local delivery where available"],
          ["Dhaka", "2–4 business days", "Timeline depends on courier capacity"],
          ["Outside major cities", "3–7 business days", "Remote areas can require extra time"],
        ],
      },
    },
    {
      id: "cost",
      title: "Delivery Cost",
      body: [
        "Delivery fees are calculated by zone during checkout. Admin delivery-zone settings remain the source of truth for live pricing.",
      ],
    },
    {
      id: "packaging",
      title: "Packaging & Tracking",
      bullets: [
        "Orders are packed after quality checks.",
        "Use the Track Order page with your order number and phone.",
        "Contact support if tracking does not update within the expected window.",
      ],
    },
  ],
}

export const sizeGuidePage: InfoPageData = {
  eyebrow: "Size Guide",
  title: "Find your best Doshok fit.",
  description:
    "Use these general measurements as a guide, then check individual product notes for fabric stretch, cut, and fit comments.",
  actions: [{ label: "Shop Products", href: "/products" }],
  sections: [
    {
      id: "tops",
      title: "Tops",
      table: {
        headers: ["Size", "Chest", "Waist", "Shoulder"],
        rows: [
          ["S", "34–36 in", "28–30 in", "14–15 in"],
          ["M", "36–38 in", "30–32 in", "15–16 in"],
          ["L", "38–40 in", "32–34 in", "16–17 in"],
          ["XL", "40–43 in", "34–37 in", "17–18 in"],
        ],
      },
    },
    {
      id: "bottoms",
      title: "Bottoms",
      table: {
        headers: ["Size", "Waist", "Hip", "Length"],
        rows: [
          ["S", "28–30 in", "36–38 in", "Regular"],
          ["M", "30–32 in", "38–40 in", "Regular"],
          ["L", "32–34 in", "40–42 in", "Regular"],
          ["XL", "34–37 in", "42–45 in", "Regular"],
        ],
      },
    },
    {
      id: "measure",
      title: "How to Measure",
      bullets: [
        "Chest: measure around the fullest part.",
        "Waist: measure the natural waistline.",
        "Hip: measure around the fullest part of the hip.",
        "Compare with product-specific fit notes before checkout.",
      ],
    },
  ],
}

export const storeLocatorPage: InfoPageData = {
  eyebrow: "Stores",
  title: "Doshok locations and service points.",
  description:
    "Store pages are ready for a premium single-vendor experience. Confirm live opening hours before visiting.",
  actions: [{ label: "Contact Before Visit", href: "/contact" }],
  stats: [
    { value: "3", label: "Planned locations" },
    { value: "2", label: "Coming soon cities" },
    { value: "BD", label: "Nationwide delivery" },
  ],
  sections: [
    {
      id: "locations",
      title: "Locations",
      cards: [
        { title: "Doshok Tejgaon — Flagship", body: "Primary brand experience, fittings, and customer support appointments.", meta: "Dhaka" },
        { title: "Doshok Gulshan", body: "Premium shopping point for curated seasonal collections.", meta: "Dhaka" },
        { title: "Doshok Chattogram", body: "Local support point for inside Chattogram delivery and order help.", meta: "Chattogram" },
      ],
    },
    {
      id: "soon",
      title: "Coming Soon",
      bullets: [
        "Sylhet service point.",
        "Khulna service point.",
        "More appointment-based try-on options.",
      ],
    },
  ],
}

export const storiesPage: InfoPageData = {
  eyebrow: "Stories",
  title: "Inside the Doshok wardrobe.",
  description:
    "Editorial notes from the workshop, city life, fabric choices, and the people shaping the brand.",
  actions: [{ label: "Explore Products", href: "/products" }],
  sections: [
    {
      id: "latest",
      title: "Latest Stories",
      cards: [
        { title: "Workshop Notes", body: "How fit, fabric, and finish decisions shape a collection before launch." },
        { title: "City Uniforms", body: "Everyday outfits for warm commutes, dinner plans, and long workdays." },
        { title: "People of Doshok", body: "The makers, packers, and support voices behind every order." },
      ],
    },
    {
      id: "editorial",
      title: "Editorial Direction",
      body: [
        "Stories will grow into buying guides, care advice, collection edits, and customer-led wardrobe inspiration.",
      ],
    },
  ],
}

export const termsPage: InfoPageData = {
  eyebrow: "Terms",
  title: "Clear terms for confident shopping.",
  description:
    "These terms explain how purchases, pricing, delivery, returns, account use, and content ownership work on Doshok.",
  actions: [{ label: "Contact Support", href: "/contact" }],
  sections: [
    {
      id: "site",
      title: "Using the Site",
      body: [
        "By using Doshok, you agree to use the site lawfully, provide accurate checkout information, and avoid attempts to disrupt store operations.",
      ],
    },
    {
      id: "orders",
      title: "Orders & Pricing",
      bullets: [
        "Orders are subject to stock confirmation.",
        "Prices, discounts, coupons, and delivery fees may change before checkout confirmation.",
        "We may cancel suspicious, incorrect, or unavailable orders with customer notice.",
      ],
    },
    {
      id: "delivery",
      title: "Delivery, Returns & Liability",
      body: [
        "Delivery timelines are estimates. Return and exchange eligibility depends on the condition of the item and the policy active at purchase time.",
        "Doshok is not responsible for indirect losses, misuse of products, or delays caused by events outside reasonable control.",
      ],
    },
    {
      id: "ip",
      title: "Intellectual Property",
      body: [
        "Doshok branding, product copy, photography, and site content belong to Doshok or its licensors and may not be copied for commercial use without permission.",
      ],
    },
  ],
}
