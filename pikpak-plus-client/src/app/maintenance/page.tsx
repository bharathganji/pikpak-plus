"use client";

import { useState } from "react";
import { ServerCrash, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MaintenancePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Add a small delay to show feedback before actual reload
    setTimeout(() => {
      globalThis.location.href = "/"; // Try to go back home
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center animate-in fade-in duration-500">
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-all duration-500" />
        <div className="relative bg-card p-6 rounded-full border border-border/50 shadow-xl">
          <ServerCrash className="w-16 h-16 text-red-500" />
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight mb-3 text-foreground">
        System Maintenance
      </h1>

      <p className="text-muted-foreground max-w-[500px] text-lg mb-8 leading-relaxed">
        We are currently experiencing connection issues with our backend
        services. The system is in maintenance mode while we reconnect.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Button
          size="lg"
          onClick={handleRetry}
          disabled={isRetrying}
          className="min-w-[160px] font-semibold shadow-lg hover:shadow-primary/25 transition-all"
        >
          <RefreshCcw
            className={`mr-2 h-5 w-5 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Checking..." : "Retry Connection"}
        </Button>
      </div>

      <div className="mt-12 text-sm text-muted-foreground/60">
        <p>Error Code: 503 Service Unavailable</p>
      </div>
    </div>
  );
}
