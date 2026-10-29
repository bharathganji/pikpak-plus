"use client";

import { DownloadsTab } from "@/components/features/downloads/downloads-tab";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DownloadsPage() {
  return (
    <div className="w-full max-w-full">
      <ErrorBoundary title="Failed to load Downloads">
        <DownloadsTab />
      </ErrorBoundary>
    </div>
  );
}

