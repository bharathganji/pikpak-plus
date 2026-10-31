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
        className="flex min-h-screen flex-col items-center p-2 md:p-4 lg:p-8 
        bg-linear-to-b from-background to-muted/20 overflow-x-hidden w-full"
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
