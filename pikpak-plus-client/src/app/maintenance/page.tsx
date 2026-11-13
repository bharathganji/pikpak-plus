"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  RefreshCcw,
  Home,
  HelpCircle,
  Send,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMaintenanceConfig } from "@/lib/maintenance-config";

export default function MaintenancePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const router = useRouter();
  const config = getMaintenanceConfig();

  const handleRetry = () => {
    setIsRetrying(true);
    // Add small delay to provide tactile user feedback
    setTimeout(() => {
      router.push("/");
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center animate-in fade-in duration-500 selection:bg-amber-500/20">
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all duration-500" />
        <div className="relative bg-card p-6 rounded-full border border-amber-500/30 shadow-xl ring-4 ring-amber-500/10">
          <Wrench className="w-14 h-14 text-amber-500 animate-pulse" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        <Clock className="w-3.5 h-3.5" />
        <span>Maintenance Mode Active • Services Standby</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-foreground max-w-xl">
        {config.title}
      </h1>

      <p className="text-muted-foreground max-w-[560px] text-base sm:text-lg mb-8 leading-relaxed">
        {config.message}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full max-w-md">
        <Button
          size="lg"
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full sm:w-auto min-w-[170px] font-semibold shadow-lg hover:shadow-primary/25 transition-all gap-2"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Checking Services..." : "Check System Status"}
        </Button>

        <Link href="/" className="w-full sm:w-auto">
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto min-w-[150px] gap-2 border-border/80"
          >
            <Home className="h-4 w-4" />
            <span>Go to Home Page</span>
          </Button>
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-muted-foreground">
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <HelpCircle className="h-4 w-4 text-primary" />
          <span>Knowledge Base & FAQ</span>
        </Link>
        <span className="text-border">•</span>
        <a
          href={config.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <Send className="h-4 w-4 text-sky-500" />
          <span>Telegram Announcements</span>
        </a>
      </div>

      <div className="mt-12 inline-flex items-center gap-2 text-xs text-muted-foreground/60 border border-border/40 rounded-full px-3 py-1 bg-muted/30">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
        <span>
          SEO Protected • Canonical Homepage Online • 503 Service Standby
        </span>
      </div>
    </div>
  );
}
