"use client";

import { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Fab } from "@/components/layout/fab";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
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
  );
}

