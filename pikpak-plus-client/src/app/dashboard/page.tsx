"use client";

import { CreateShareTab } from "@/components/features/create-share/create-share-tab";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function CreateSharePage() {
  return (
    <div className="w-full max-w-full">
      <ErrorBoundary title="Failed to load Create & Share">
        <CreateShareTab />
      </ErrorBoundary>
    </div>
  );
}

