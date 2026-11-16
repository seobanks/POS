import {
  CalendarClock,
  Clock,
  Truck,
  Users,
  Landmark,
  BarChart3,
  Megaphone,
  Wrench,
  ChefHat,
  LayoutDashboard,
  ClipboardList,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavSection =
  | "OPERATIONS"
  | "CATALOG & INVENTORY"
  | "GROWTH & CRM"
  | "FINANCE & REPORTS"
  | "ADMINISTRATION";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  section?: NavSection;
}

export const NAV_ITEMS: NavItem[] = [
  // OPERATIONS
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.sales.view", section: "OPERATIONS" },
  { labelKey: "nav.pos", href: "/pos", icon: ShoppingCart, permission: "orders.create", section: "OPERATIONS" },
  { labelKey: "nav.orders", href: "/orders", icon: ClipboardList, permission: "orders.create", section: "OPERATIONS" },
  { labelKey: "nav.tables", href: "/tables", icon: LayoutGrid, permission: "tables.view", section: "OPERATIONS" },
  { labelKey: "nav.kds", href: "/kds", icon: ChefHat, permission: "kds.manage", section: "OPERATIONS" },
  { labelKey: "nav.reservations", href: "/reservations", icon: CalendarClock, permission: "reservations.manage", section: "OPERATIONS" },

  // CATALOG & INVENTORY
  { labelKey: "nav.menu", href: "/menu", icon: UtensilsCrossed, permission: "menu.view", section: "CATALOG & INVENTORY" },
  { labelKey: "nav.inventory", href: "/inventory", icon: Package, permission: "inventory.manage", section: "CATALOG & INVENTORY" },
  { labelKey: "nav.delivery", href: "/delivery", icon: Truck, permission: "delivery.manage", section: "CATALOG & INVENTORY" },

  // GROWTH & CRM
  { labelKey: "nav.customers", href: "/customers", icon: UsersRound, permission: "customers.manage", section: "GROWTH & CRM" },
  { labelKey: "nav.marketing", href: "/marketing", icon: Megaphone, permission: "marketing.manage", section: "GROWTH & CRM" },

  // FINANCE & REPORTS
  { labelKey: "nav.accounting", href: "/accounting", icon: Landmark, permission: "accounting.manage", section: "FINANCE & REPORTS" },
  { labelKey: "nav.reports", href: "/reports", icon: BarChart3, permission: "reports.access", section: "FINANCE & REPORTS" },

  // ADMINISTRATION
  { labelKey: "nav.team", href: "/team", icon: Users, permission: "staff.manage", section: "ADMINISTRATION" },
  { labelKey: "nav.attendance", href: "/attendance", icon: Clock, section: "ADMINISTRATION" },
  { labelKey: "nav.operations", href: "/operations", icon: Wrench, permission: "operations.manage", section: "ADMINISTRATION" },
  { labelKey: "nav.settings", href: "/settings", icon: Settings, permission: "settings.manage", section: "ADMINISTRATION" },
];
