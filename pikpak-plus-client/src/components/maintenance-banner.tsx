"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMaintenanceConfig } from "@/lib/maintenance-config";

export interface MaintenanceBannerProps {
  /** Optional custom title override */
  title?: string;
  /** Optional custom message override */
  message?: string;
  /** Optional extra CSS classes */
  className?: string;
}

/**
 * MaintenanceBanner Component
 *
 * In accordance with Google Search Central guidelines for long-term site maintenance
 * when the server is down, this banner alerts visitors without impacting search indexing:
 * - Homepage continues returning HTTP 200 OK with full canonical metadata.
 * - Visible informative announcement clarifies that backend services are in maintenance.
 * - Visitors can still browse documentation, FAQ, and join Telegram for live status updates.
 */
export function MaintenanceBanner({
  title,
  message,
  className = "",
}: MaintenanceBannerProps) {
  const config = getMaintenanceConfig();
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <aside
      role="status"
      aria-label="Maintenance Announcement"
      className={`w-full max-w-5xl mx-auto mb-8 px-4 sm:px-6 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-6 shadow-lg shadow-amber-500/5 backdrop-blur-xs">
        {/* Ambient accent glow */}
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 max-w-3xl">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 ring-2 ring-amber-500/10">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Scheduled Maintenance
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                {displayTitle}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {displayMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full md:w-auto pt-2 md:pt-0">
            <Link href="/faq" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-amber-500/40 text-xs sm:text-sm font-medium hover:bg-amber-500/15 hover:text-amber-900 dark:hover:text-amber-200 transition-colors gap-1.5"
              >
                <span>Read FAQ</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="w-full sm:w-auto text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-200 transition-colors gap-1.5"
            >
              <a
                href={config.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Telegram Updates</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
