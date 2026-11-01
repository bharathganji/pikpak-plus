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
      <main
        className="flex min-h-screen flex-col items-center px-2 sm:px-4 md:px-6 lg:px-8 py-2 md:py-4 lg:py-6 bg-linear-to-b from-background via-background to-muted/20 overflow-x-hidden w-full selection:bg-primary/20"
      >
        <Header />
        <DashboardNav />
        <div className="w-full max-w-6xl">{children}</div>
        <Footer />
        <Fab />
        <DisclaimerModal />
      </main>
    </AuthGuard>
  );
}
