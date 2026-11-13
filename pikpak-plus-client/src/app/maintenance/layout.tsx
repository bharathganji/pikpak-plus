import type { Metadata } from "next";

/**
 * Metadata configuration for the Maintenance route.
 *
 * CRITICAL SEO RULE (Google Search Central):
 * The /maintenance route MUST never be indexed or cached by search engines.
 * This prevents Googlebot from replacing the canonical homepage title,
 * snippet, or indexed keywords with temporary maintenance copy.
 */
export const metadata: Metadata = {
  title: "System Maintenance - PikPak Plus",
  description:
    "PikPak Plus is currently undergoing scheduled system maintenance. Please check back soon or visit our knowledge base.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
