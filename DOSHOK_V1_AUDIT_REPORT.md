# Doshok V1 — Full Ecommerce Admin Architecture Audit & Rebuild Plan

**Date:** June 11, 2026
**Status:** AUDIT COMPLETE — IMPLEMENTATION NOT STARTED
**Rule:** Do not implement. Do not commit. Do not push.

---

## 1. TODO CHECKLIST

### Phase 1: Foundation (Admin Structure)
- [ ] Audit current admin routes and clean up hub pages
- [ ] Rebuild admin sidebar with proper module structure
- [ ] Implement Inventory module (Stock Overview, Stock Movements, Low Stock Alerts)
- [ ] Add stock movement tracking to database
- [ ] Update product edit form with stock management

### Phase 2: Core Modules
- [ ] Implement Review System (schema, API, admin UI, frontend display)
- [ ] Implement Careers System (schema, API, admin UI, frontend pages)
- [ ] Implement CMS Pages (database model, admin UI, storefront pages)
- [ ] Implement Size Charts (schema, API, admin UI, product page integration)

### Phase 3: Dashboard & Reports
- [ ] Rebuild Dashboard with all real data metrics
- [ ] Add order status breakdown to dashboard
- [ ] Add inventory alerts to dashboard
- [ ] Add quick actions to dashboard
- [ ] Implement basic Reports module (optional V1)

### Phase 4: Frontend Cleanup
- [ ] Audit and plan duplicate page removal
- [ ] Implement /careers/[id] dynamic page
- [ ] Integrate reviews into product detail page
- [ ] Integrate size charts into product detail page
- [ ] Clean up policy pages

### Phase 5: Integration
- [ ] Test order-stock flow
- [ ] Test admin workflows end-to-end
- [ ] Verify all links and navigation

---

## 2. CURRENT ROUTE AUDIT

### Frontend Routes (Current)

| Route | Status | Action |
|-------|--------|--------|
| `/` | Active | Keep |
| `/products` | Active | Keep |
| `/products/[slug]` | Active | Keep |
| `/cart` | Active | Keep |
| `/checkout` | Active | Keep |
| `/order/[orderNumber]` | Active | Keep |
| `/order/failed` | Active | Keep |
| `/order/payment-retry` | Active | Keep |
| `/track-order` | Active | Keep |
| `/recover-checkout` | Active | Keep |
| `/search` | Active | Keep |
| `/account` | Active | Keep |
| `/account/login` | Active | Keep |
| `/account/profile` | Active | Keep |
| `/account/addresses` | Active | Keep |
| `/account/orders` | Active | Keep |
| `/account/orders/[id]` | Active | Keep |
| `/about` | Active (static) | Keep — move to CMS |
| `/contact` | Active (static) | Keep — move to CMS |
| `/faq` | Active (static) | Keep — move to CMS |
| `/delivery` | Active (static) | Merge with Shipping |
| `/shipping` | Active (static) | Keep — move to CMS |
| `/size-guide` | Active (static) | Keep — move to CMS |
| `/care-guide` | Active (static) | Keep — move to CMS |
| `/careers` | Active (static) | Replace with dynamic |
| `/careers/[id]` | Missing | Create |
| `/stories` | Active (static) | Keep — move to CMS |
| `/accessibility` | Active (static) | Keep — move to CMS |
| `/cookies` | Active (static) | Keep — move to CMS |
| `/privacy` | Active (static) | Merge with privacy-policy |
| `/privacy-policy` | Active (static) | Keep |
| `/returns` | Active (static) | Merge with return-policy |
| `/return-policy` | Active (static) | Keep |
| `/terms` | Active (static) | Keep — move to CMS |
| `/policy` | Active (static) | Merge into CMS hub |
| `/gift-cards` | Active (static) | Remove — not implemented |
| `/store-locator` | Active (static) | Remove — merge into Contact |
| `/new-arrivals` | Active | Keep |
| `/help` | Active (static) | Merge into FAQ |
| `/l/` | Landing | Keep |

---

## 3. FRONTEND KEEP/MERGE/REMOVE LIST

### KEEP (Core Routes)
- `/` — Homepage
- `/products` — Product listing
- `/products/[slug]` — Product detail
- `/cart` — Cart
- `/checkout` — Checkout
- `/order/[orderNumber]` — Order confirmation
- `/track-order` — Order tracking
- `/account/*` — Account pages
- `/contact` — Contact (with store location section)
- `/faq` — FAQ page

### MERGE (Consolidate)
- `/privacy` → `/privacy-policy`
- `/returns` → `/return-policy`
- `/delivery` → `/shipping`
- `/help` → `/faq`
- `/policy` → `/faq` or dedicated policy hub

### REMOVE (No Business Purpose)
- `/gift-cards` — No gift card system implemented
- `/store-locator` — No physical stores; merge into contact

### CMS-CONTROLLED (Move from static to dynamic)
- `/about`
- `/contact`
- `/faq`
- `/shipping`
- `/size-guide`
- `/care-guide`
- `/stories`
- `/accessibility`
- `/cookies`
- `/privacy-policy`
- `/return-policy`
- `/terms`

### CREATE
- `/careers/[id]` — Dynamic career detail page

---

## 4. ADMIN KEEP/MERGE/REMOVE/REBUILD LIST

### Current Admin Structure
```
/admin/dashboard — Keep (needs rebuild with real data)
/admin/commerce — Hub page (keep but restructure)
/admin/products — Keep (needs rebuild for stock management)
/admin/products/new — Keep
/admin/products/[id] — Keep
/admin/categories — Keep
/admin/subcategories — Merge into Categories
/admin/coupons — Keep
/admin/landing-pages — Keep
/admin/orders — Keep
/admin/orders/[id] — Keep (needs rebuild for stock movements)
/admin/abandoned — Keep
/admin/customers — Hub page (keep)
/admin/customers/list — Keep
/admin/customers/orders — Keep (or merge into Orders with filter)
/admin/customers/addresses — Keep
/admin/reviews — Keep (empty placeholder — needs full rebuild)
/admin/careers — Keep (empty placeholder — needs full rebuild)
/admin/homepage — Keep (needs enhancement)
/admin/cms — Hub page (keep but restructure)
/admin/cms/pages — Keep (placeholder — needs rebuild)
/admin/cms/footer — Keep (redirects to site-settings)
/admin/cms/menus — Keep
/admin/cms/banners — Keep (placeholder)
/admin/operations — Hub page (keep)
/admin/payment-methods — Keep
/admin/courier-methods — Keep
/admin/delivery-zones — Keep
/admin/support — Hub page (keep)
/admin/support/messages — Keep (placeholder)
/admin/support/tickets — Keep (placeholder)
/admin/settings — Hub page (keep)
/admin/site-settings — Keep
/admin/size-charts — Keep (empty placeholder)
/admin/sales — Hub page (keep — redundant with orders)
/admin/site-settings — Keep
```

### Action Summary
- **Keep:** dashboard, products, categories, coupons, landing-pages, orders, abandoned, customers (hub + subpages), homepage, cms (hub + subpages), operations (hub + subpages), support (hub + subpages), settings (hub + subpages), size-charts
- **Merge:** subcategories into categories, sales hub into orders dashboard
- **Replace:** reviews placeholder with full implementation, careers placeholder with full implementation, cms/pages placeholder with CMS model
- **Remove:** redundant hub pages (keep only final structure)
- **Rebuild:** dashboard, orders/[id] (add stock movements), homepage, cms/pages

---

## 5. FINAL SIDEBAR PROPOSAL

```
Dashboard
Commerce
  Products
  Categories
  Coupons
  Landing Pages
Inventory
  Stock Overview
  Stock Movements
  Low Stock Alerts
Sales
  Orders
  Abandoned Checkouts
Customers
  Customer List
Reviews
  Product Reviews
Careers
  Career Posts
CMS
  Homepage
  Footer
  Menus
  Pages
  Stories/About
Operations
  Payment Methods
  Courier Methods
  Delivery Zones
Support
  Contact Messages
  Support Tickets
Settings
  Site Settings
```

### Changes from Current:
1. Add **Inventory** section (new)
2. Move **Reviews** to top-level (from Customers)
3. Move **Careers** to top-level (from CMS)
4. Add **Footer** under CMS (standalone from site-settings)
5. Add **Stock Movements** (new)
6. Add **Low Stock Alerts** (new)
7. Add **Stories/About** under CMS (new)
8. Rename landing-pages → landing pages consistency

---

## 6. NEW MODULES REQUIRED

### 1. Inventory Module
**Need:** New page under Inventory
- Stock Overview — Product/variant stock summary
- Stock Movements — Track all stock changes with history
- Low Stock Alerts — Products below threshold

**Database:**
- Add StockMovement model to track all stock changes

### 2. Review System
**Need:** Full implementation
- Database model for ProductReview
- Admin page for reviewing/hiding/approving
- Frontend display on product page
- Verified purchase validation

### 3. Careers System
**Need:** Full implementation
- Database model for CareerPost
- Admin page for CRUD operations
- Frontend pages: /careers and /careers/[id]

### 4. CMS Pages System
**Need:** Full implementation
- Database model for CmsPage
- Admin page for content editing
- Dynamic rendering for storefront pages

### 5. Size Charts System
**Need:** Full implementation
- Database model for SizeChart
- Admin page for creating charts
- Integration with product detail page

---

## 7. PRODUCT SYSTEM GAP ANALYSIS

### Current Schema (Prisma)
```
Product:
  id, name, slug, description, price, oldPrice, images[]
  categoryId, featured, status, pageType
  defaultCouponCode, landingHeadline, landingSubheadline, landingCopy, landingHeroImage

ProductVariant:
  id, productId, size, color, colorHex, stock, sku
```

### Missing from Current Schema
- [ ] Short description / subtitle
- [ ] Specifications / technical info
- [ ] SEO title, SEO description, SEO keywords
- [ ] SEO image
- [ ] Size chart selection (relation to SizeChart)
- [ ] Cross-sell product IDs
- [ ] Upsell product IDs
- [ ] Related product IDs
- [ ] SKU per variant — EXISTS but not in product edit
- [ ] Reserved stock tracking
- [ ] Stock movement history

### Current Product Form Missing
- [ ] Short description field
- [ ] Specifications editor
- [ ] SEO fields (title, description, keywords, image)
- [ ] Size chart selector
- [ ] Cross-sell/upsell product picker
- [ ] Stock management (current, reserved, available)

### Frontend Product Detail Missing
- [ ] Specifications tab
- [ ] SEO metadata output
- [ ] Cross-sell/upsell section
- [ ] Reviews integration

### Recommendations
1. Add missing fields to Product model
2. Create ProductSpecification model for key-value specs
3. Create SizeChart model and admin interface
4. Add SEO fields to product edit form
5. Add product relation fields (cross-sell, upsell, related)
6. Update product detail page to show all fields

---

## 8. INVENTORY SYSTEM PLAN

### Current Stock Handling
- ProductVariant.stock — current stock only
- No movement tracking
- No reserved stock
- No low stock threshold per product

### Proposed V1 Inventory

**New Model: StockMovement**
```prisma
model StockMovement {
  id          String   @id @default(cuid())
  productId   String
  variantId   String?
  type        String   // manual, order_created, order_confirmed, order_cancelled, order_delivered, order_returned
  quantity    Int      // positive for add, negative for deduct
  reason      String?
  orderId     String?
  adminId     String?
  createdAt   DateTime @default(now())
}
```

**Stock Calculation:**
```
currentStock = ProductVariant.stock
reservedStock = Calculated from pending orders (optional V2)
availableStock = currentStock - reservedStock
lowStockThreshold = ProductVariant.lowStockThreshold (default 5)
```

### Order-Stock Rules (Recommended V1)

1. **When order is placed:**
   - Stock is NOT immediately deducted
   - Stock remains available for other customers

2. **When payment confirmed (order confirmed):**
   - Deduct stock from variant
   - Create stock movement: type="order_confirmed", quantity=-ordered_quantity

3. **When order cancelled (before shipment):**
   - Restore stock to variant
   - Create stock movement: type="order_cancelled", quantity=+ordered_quantity

4. **When order delivered:**
   - No stock change (already deducted at confirmation)

5. **When order returned:**
   - Optional: restore stock based on condition
   - Create stock movement: type="order_returned", quantity=+returned_quantity

### Inventory Admin Pages

**Stock Overview:**
- List all products with variants
- Show current stock per variant
- Show low stock indicator
- Quick edit stock

**Stock Movements:**
- List all stock changes with filters
- Type, date range, product filter
- Movement reason and source

**Low Stock Alerts:**
- Products/variants below threshold
- Click to edit product
- Threshold configurable per product (default 5)

---

## 9. ORDER MANAGEMENT PLAN

### Current Order Detail Page
- Customer info
- Delivery address
- Payment & order status
- Order totals
- Order items
- Shipment/courier info
- Payment transactions

### Missing from Order Detail
- [ ] Stock movement summary for items
- [ ] Activity log / timeline
- [ ] Internal notes field
- [ ] Refund/return info (basic exists but incomplete)
- [ ] Admin action buttons (mark delivered, cancel, etc.)

### Recommendations
1. Add `notes` field to Order model (exists)
2. Create OrderActivity model for timeline
3. Add stock movement reference to OrderItem
4. Enhance order status update to log activity
5. Add refund tracking fields (partially exists)

---

## 10. REVIEW SYSTEM PLAN

### Current State
- Reviews page exists but is placeholder
- No review model in schema
- No API for reviews
- No frontend review display

### Proposed Review System

**New Model:**
```prisma
model ProductReview {
  id          String   @id @default(cuid())
  productId   String
  userId      String
  orderId     String?  // verified purchase
  rating      Int      // 1-5
  title       String?
  content     String
  status      String   @default("pending") // pending, approved, hidden, rejected
  adminReply  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([productId, orderId]) // One review per purchased product
}
```

**Rules:**
1. Only verified customers can review (purchased product)
2. Order must be delivered before review (recommended)
3. One review per purchased product/order item
4. Admin can approve, hide, delete, reply

**Frontend Display:**
- Show on product detail page
- Average rating
- Review count
- Verified purchase badge
- List of approved reviews

**Admin Features:**
- List all reviews with filters
- Approve/hide/delete
- Reply to review
- View associated order

---

## 11. CAREER SYSTEM PLAN

### Current State
- Careers page exists but is static (hardcoded in info-pages.ts)
- No career model in schema
- No API for careers
- No admin interface

### Proposed Career System

**New Model:**
```prisma
model CareerPost {
  id              String   @id @default(cuid())
  title           String
  slug            String   @unique
  department      String?
  location        String?
  employmentType  String?  // full-time, part-time, contract, internship
  salaryRange     String?
  deadline        DateTime?
  description     String
  responsibilities String?
  requirements    String?
  benefits        String?
  status          String   @default("draft") // draft, open, closed
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Frontend Pages:**
- `/careers` — List all open positions
- `/careers/[slug]` — Career detail page

**Admin Features:**
- CRUD operations for career posts
- Status management (draft, open, closed)
- Preview before publishing

**Optional V2:**
- Application form
- Resume upload
- Applicant management

---

## 12. CMS OWNERSHIP PLAN

### Current Issues
- Settings scattered across multiple places
- Footer editing buried in site-settings
- Static pages hardcoded in lib/info-pages.ts
- No CMS model for dynamic pages

### Final CMS Ownership

**Homepage (/admin/homepage):**
- Hero title, subtitle, image
- Announcement bar
- Promo banner
- Featured products
- (Announcement bar is in HomepageConfig — keep)

**Footer (/admin/cms/footer):**
- Standalone footer CMS page
- Footer logo/text
- Footer columns
- Footer links
- Contact summary
- Social icons
- Copyright

**Menus (/admin/cms/menus):**
- Desktop header menu
- Mobile menu
- Footer menu groups
- (Currently works via site-settings — needs clean separation)

**Pages (/admin/cms/pages):**
- About, Contact, FAQ, Shipping, etc.
- Dynamic CMS page model
- WYSIWYG or structured content editor

**Stories/About (/admin/cms/stories):**
- Brand storytelling content
- Editorial content management

### Settings (/admin/site-settings):
Only global config:
- Brand name
- Logo/favicon
- SEO defaults (meta title, description)
- Contact info
- Social links
- Theme/accent
- Store status

### Banners:
- No separate banners module
- Merge announcement bar into Homepage
- Promo banner into Homepage

### Store Locator:
- No standalone store locator
- Optional store/location section in Contact page

---

## 13. PRODUCT DETAIL FRONTEND PLAN

### Current Implementation
- Product gallery
- Title, category
- Price/discount
- SKU (not shown)
- Stock/availability
- Variant selectors (size, color)
- Size guide popup (static table)
- Long description
- Delivery/return info (static)
- Related products
- Recently viewed

### Missing
- Short description/subtitle
- Specifications tab
- Reviews section
- Size chart selector per product
- Cross-sell/upsell products
- SEO metadata output

### Recommendations
1. Add short description field display
2. Add Specifications tab with dynamic content
3. Add Reviews tab with rating and reviews list
4. Connect size chart selector to SizeChart model
5. Add cross-sell/upsell sections
6. Ensure SEO meta tags are output correctly

---

## 14. FRONTEND CLEANUP RECOMMENDATIONS

### Remove/Merge Candidates
1. `/gift-cards` — No gift card system; remove
2. `/store-locator` — No physical stores; merge into contact page
3. `/privacy` — Duplicate; 301 redirect to /privacy-policy
4. `/returns` — Duplicate; 301 redirect to /return-policy
5. `/delivery` — Merge into /shipping
6. `/help` — Merge into /faq

### Keep but CMS-ify
1. `/about` — Move from static to CMS
2. `/contact` — Move from static to CMS, add store location section
3. `/faq` — Move from static to CMS
4. `/shipping` — Move from static to CMS
5. `/size-guide` — Keep but connect to SizeChart model
6. `/care-guide` — Move from static to CMS
7. `/stories` — Move from static to CMS
8. `/accessibility` — Move from static to CMS
9. `/cookies` — Move from static to CMS
10. `/privacy-policy` — Move from static to CMS
11. `/return-policy` — Move from static to CMS
12. `/terms` — Move from static to CMS

### Create
1. `/careers/[id]` — Dynamic career detail page

---

## 15. REPORTS RECOMMENDATION

### Decision: V1 — Dashboard-Only Reports

**Rationale:** Keep V1 lightweight. No separate reports module yet.

**Dashboard should show:**
- Total revenue (paid orders)
- Total orders
- Orders by status (pending, processing, delivered, cancelled)
- Customers count
- Products count
- Low stock count
- Recent orders (last 8)
- Quick links to relevant admin sections

**Future (V2) Reports Module:**
- Sales report (date range, filters)
- Product performance
- Inventory report
- Customer report
- Coupon usage
- Payment report
- Courier/shipment report

---

## 16. SUGGESTED IMPLEMENTATION BATCHES IN ORDER

### Batch 1: Database & Schema Changes
1. Add StockMovement model
2. Add ProductReview model
3. Add CareerPost model
4. Add CmsPage model
5. Add SizeChart model
6. Add missing fields to Product model
7. Update ProductVariant with lowStockThreshold
8. Run migrations

### Batch 2: Admin Structure & Sidebar
1. Update admin layout with new sidebar structure
2. Remove/redesign hub pages where appropriate
3. Add Inventory section to sidebar
4. Add Reviews section to sidebar
5. Add Careers section to sidebar

### Batch 3: Inventory Module
1. Create Stock Overview page
2. Create Stock Movements page
3. Create Low Stock Alerts page
4. Add stock movement tracking to order flows
5. Update product edit to show stock management

### Batch 4: Review System
1. Create Review API routes
2. Create Admin Reviews page (list, approve, hide, delete)
3. Create frontend reviews component
4. Integrate into product detail page
5. Add verified purchase badge

### Batch 5: Careers System
1. Create Careers API routes
2. Create Admin Careers page (CRUD)
3. Create /careers page (list open positions)
4. Create /careers/[slug] page (detail)
5. Remove static careers from info-pages.ts

### Batch 6: CMS System
1. Create CMS Pages API routes
2. Create Admin CMS Pages page (content editing)
3. Create dynamic page rendering for storefront
4. Migrate static pages to CMS model
5. Remove static page handlers from info-pages.ts

### Batch 7: Dashboard Rebuild
1. Add all real data metrics to dashboard
2. Add order status breakdown
3. Add inventory alerts section
4. Add quick actions
5. Make stat cards clickable

### Batch 8: Frontend Cleanup
1. Add /careers/[id] dynamic page
2. Add size chart integration to product detail
3. Add specifications to product detail
4. Add cross-sell/upsell to product detail
5. Clean up duplicate policy pages (301 redirects)
6. Remove /gift-cards and /store-locator

### Batch 9: Integration & Testing
1. Test order-stock flow end-to-end
2. Test admin workflows
3. Verify all navigation links
4. Test mobile responsive
5. Final polish and bug fixes

---

## SUMMARY

The current Doshok system has:
- Solid ecommerce core (products, orders, cart, checkout)
- Working payment integration (COD only)
- Working courier integration (Pathao)
- Basic admin structure with hub pages
- Static content pages hardcoded

**Gaps to fill:**
1. Inventory module (stock tracking, movements)
2. Review system (verified purchase reviews)
3. Careers system (dynamic job listings)
4. CMS system (dynamic pages, content editing)
5. Size charts system
6. Dashboard with real data
7. Product system enhancements (specs, SEO, cross-sell)

**Not needed:**
- Multi-vendor/marketplace
- Advanced reports (V1)
- Gift card system
- Store locator
- Fake/demo content

**Implementation Priority:**
1. Database schema (foundation)
2. Admin structure (navigation)
3. Inventory (critical for orders)
4. Reviews (customer trust)
5. Careers (hiring pipeline)
6. CMS (content flexibility)
7. Dashboard (visibility)
8. Frontend cleanup (UX)