import { ReactNode } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Fab } from "@/components/layout/fab";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { AuthGuard } from "@/components/auth/auth-guard";

export const metadata: Metadata = {
  title: {
    template: "%s | PikPak Plus",
    default: "Dashboard | PikPak Plus",
  },
  description: "PikPak Plus Application Workspace",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen w-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 overflow-x-hidden">
        {/* WCAG AA Skip to main content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        {/* Subtle Ambient Radial Lighting Layer */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.12),transparent_70%)] opacity-70 dark:opacity-100"
        />

        {/* Global Sticky Glassmorphism Header */}
        <Header />

        {/* Main Content Area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 flex flex-col items-center focus:outline-none"
        >
          {/* Modern Segmented Navigation Bar */}
          <DashboardNav />

          {/* Tab View Container */}
          <div className="w-full max-w-6xl">{children}</div>
        </main>

        {/* Footer & Ancillary Controls */}
        <Footer className="relative z-10" />
        <Fab />
        <DisclaimerModal />
      </div>
    </AuthGuard>
  );
}
