"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ShoppingCart } from "lucide-react";
import type { SessionUser } from "@nodedr-restaurant/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NavDot } from "./nav-dot";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({
  user,
  onNavigate,
}: {
  user?: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();

  const roleUpper = user?.roleName?.trim().toUpperCase() ?? "";
  const isCashier = roleUpper === "CASHIER" || roleUpper.includes("CASHIER");
  const isPosActive = pathname === "/pos" || pathname?.startsWith("/pos");

  const handleNewSaleClick = () => {
    onNavigate?.();
    if (isPosActive && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pos:new-sale"));
    }
  };

  // For cashiers, the highlighted New Sale button at the top serves as their direct
  // POS entry point, so we avoid showing a duplicate "Point of Sale" in the list below.
  // Captain (waiter) view is fetched automatically by role and never shown in the sidebar.
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/captain") return false;
    if (isCashier && item.href === "/pos") return false;
    return !item.permission || hasPermission(user, item.permission);
  });

  return (
    <nav className="flex flex-col gap-1 px-3">
      {isCashier && (
        <div className="mb-2 pb-2 border-b border-sidebar-border">
          <Link
            href="/pos"
            onClick={handleNewSaleClick}
            aria-current={isPosActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center justify-between gap-2.5 overflow-hidden rounded-xl bg-primary px-3.5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
              isPosActive && "ring-2 ring-primary ring-offset-2 ring-offset-sidebar shadow-md",
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground transition-transform group-hover:scale-110">
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-bold tracking-tight text-primary-foreground">
                {t("nav.newSale")}
              </span>
            </div>
            <span className="flex items-center gap-1 rounded-md bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground">
              <ShoppingCart className="h-3 w-3" />
              POS
            </span>
          </Link>
        </div>
      )}

      {visibleNavItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {t(item.labelKey)}
            {badges.nav[item.href] && !isActive ? <NavDot /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
