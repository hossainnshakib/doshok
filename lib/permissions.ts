export const ROLES = [
  "customer",
  "super_admin",
  "admin",
  "manager",
  "order_manager",
  "inventory_manager",
  "content_manager",
  "support_agent",
] as const

export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  order_manager: "Order Manager",
  inventory_manager: "Inventory Manager",
  content_manager: "Content Manager",
  support_agent: "Support Agent",
}

export function hasRole(userRole: string, role: Role): boolean {
  return userRole === role
}

export function hasAnyRole(userRole: string, ...roles: Role[]): boolean {
  return roles.includes(userRole as Role)
}

export function isAdminRole(role: string): boolean {
  return ROLES.includes(role as Role) && role !== "customer"
}

export type PermissionGroup =
  | "dashboard"
  | "orders"
  | "inventory"
  | "products"
  | "customers"
  | "cms"
  | "settings"
  | "support"
  | "reviews"
  | "careers"
  | "commerce"
  | "operations"
  | "import_export"
  | "short_links"

export const PERMISSION_GROUPS: PermissionGroup[] = [
  "dashboard",
  "orders",
  "inventory",
  "products",
  "customers",
  "cms",
  "settings",
  "support",
  "reviews",
  "careers",
  "commerce",
  "operations",
  "import_export",
  "short_links",
]

export const ROLE_PERMISSIONS: Record<string, PermissionGroup[]> = {
  super_admin: [
    "dashboard",
    "orders",
    "inventory",
    "products",
    "customers",
    "cms",
    "settings",
    "support",
    "reviews",
    "careers",
    "commerce",
    "operations",
    "import_export",
    "short_links",
  ],
  admin: [
    "dashboard",
    "orders",
    "inventory",
    "products",
    "customers",
    "cms",
    "settings",
    "support",
    "reviews",
    "careers",
    "commerce",
    "operations",
    "import_export",
    "short_links",
  ],
  manager: [
    "dashboard",
    "orders",
    "inventory",
    "products",
    "customers",
  ],
  order_manager: [
    "dashboard",
    "orders",
  ],
  inventory_manager: [
    "dashboard",
    "inventory",
    "products",
  ],
  content_manager: [
    "dashboard",
    "cms",
    "short_links",
  ],
  support_agent: [
    "dashboard",
    "support",
    "customers",
  ],
}

export function canAccessSection(role: string, section: PermissionGroup): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  return permissions.includes(section)
}

export function hasSettingsAccess(role: string): boolean {
  return canAccessSection(role, "settings")
}
