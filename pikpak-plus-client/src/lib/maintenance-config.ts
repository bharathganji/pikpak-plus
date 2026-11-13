/**
 * Maintenance State & Messaging Utilities
 *
 * Provides centralized messaging and helper information
 * to preserve search engine indexing (Googlebot) during extended maintenance periods
 * when the backend server is down, per Google Search Central guidelines:
 * - Keep homepage (/) accessible with HTTP 200 OK
 * - Preserve full SEO title, metadata, OpenGraph, canonical, and structured data
 * - Display an informative maintenance banner to users
 * - Disallow crawling of /maintenance fallback routes
 */

export interface MaintenanceConfig {
  /** Heading displayed in the maintenance banner and maintenance page */
  title: string;
  /** Informative description of the maintenance activity */
  message: string;
  /** Official Telegram community updates URL */
  telegramUrl: string;
}

export function getMaintenanceConfig(): MaintenanceConfig {
  return {
    title: "System Maintenance in Progress",
    message:
      "Our backend services are temporarily undergoing maintenance. Cloud downloads and account authentication are temporarily paused. Our public knowledge base, FAQ, and documentation remain available.",
    telegramUrl: "https://t.me/pikpak_plus",
  };
}
