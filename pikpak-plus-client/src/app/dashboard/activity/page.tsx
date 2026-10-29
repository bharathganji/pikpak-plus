"use client";

import { MyActivityTab } from "@/components/features/my-activity";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function ActivityPage() {
  return (
    <div className="w-full max-w-full">
      <ErrorBoundary title="Failed to load My Activity">
        <MyActivityTab />
      </ErrorBoundary>
    </div>
  );
}

