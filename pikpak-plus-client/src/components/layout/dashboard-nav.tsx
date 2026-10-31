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
  },
  {
    href: "/dashboard/downloads",
    label: "Downloads & WebDAV",
    shortLabel: "Downloads",
    icon: Download,
    exact: false,
  },
  {
    href: "/dashboard/activity",
    label: "My Activity",
    shortLabel: "Activity",
    icon: History,
    exact: false,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard views"
      className="w-full max-w-6xl mb-6 border-b border-border/50"
    >
      <div className="flex justify-center w-full max-w-2xl mx-auto p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#11151F]/90">
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
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 select-none",
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-xl px-4 py-2 text-xs sm:text-sm transition-all",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
