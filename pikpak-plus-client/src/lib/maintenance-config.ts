/**
 * Maintenance Mode Configuration and SEO Safety Utilities
 *
 * Provides centralized maintenance state configuration and helper functions
 * to preserve search engine indexing (Googlebot) during extended maintenance periods
 * (e.g. 10 days of maintenance), per Google Search Central guidelines:
 * - Keep homepage (/) accessible with HTTP 200 OK
 * - Preserve full SEO title, metadata, OpenGraph, canonical, and structured data
 * - Display an informative maintenance banner to users
 * - Disallow crawling of /maintenance fallback routes
 */

export interface MaintenanceConfig {
  /** Whether the application is explicitly configured in maintenance mode */
  isMaintenanceMode: boolean;
  /** Heading displayed in the maintenance banner and maintenance page */
  title: string;
  /** Informative description of the maintenance activity */
  message: string;
  /** Estimated duration of the maintenance window (e.g. '10 Days') */
  estimatedDuration: string;
  /** Optional target completion date string */
  endDate: string | null;
  /** Official Telegram community updates URL */
  telegramUrl: string;
}

export function getMaintenanceConfig(): MaintenanceConfig {
  const isExplicit =
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true" ||
      process.env.MAINTENANCE_MODE === "true");

  const duration =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_MAINTENANCE_DURATION) ||
    "10 Days";

  const title =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_MAINTENANCE_TITLE) ||
    "Scheduled Site Maintenance in Progress";

  const message =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE) ||
    "We are performing scheduled infrastructure upgrades to expand capacity and reliability. Cloud downloads and account authentication are temporarily paused. Our public knowledge base, FAQ, and documentation remain available.";

  const endDate =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_MAINTENANCE_END_DATE) ||
    null;

  return {
    isMaintenanceMode: isExplicit,
    title,
    message,
    estimatedDuration: duration,
    endDate,
    telegramUrl: "https://t.me/pikpak_plus",
  };
}
