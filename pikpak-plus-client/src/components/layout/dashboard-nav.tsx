"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Share2, Download, History } from "lucide-react";
import { cn } from "@/lib/utils";

export const DASHBOARD_NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Create & Share",
    shortLabel: "Create",
    icon: Share2,
    exact: true,
    description: "Submit magnets and manage active cloud tasks",
  },
  {
    href: "/dashboard/downloads",
    label: "Downloads & WebDAV",
    shortLabel: "Downloads",
    icon: Download,
    exact: false,
    description: "WebDAV configuration and storage quota",
  },
  {
    href: "/dashboard/activity",
    label: "My Activity",
    shortLabel: "Activity",
    icon: History,
    exact: false,
    description: "Personal download history and generated shares",
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard views"
      className="w-full max-w-6xl mb-6 sm:mb-8"
    >
      <div
        role="tablist"
        aria-label="Dashboard navigation tabs"
        className="grid w-full grid-cols-3 max-w-2xl mx-auto p-1.5 glass-nav rounded-2xl shadow-xs gap-1"
      >
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative inline-flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isActive
                  ? "bg-background text-foreground shadow-sm font-semibold border border-border/80 ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="hidden sm:inline tracking-tight">{item.label}</span>
              <span className="sm:hidden tracking-tight">{item.shortLabel}</span>

              {/* Active pill subtle indicator dot */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-primary animate-fade-in"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

