import type { Metadata } from "next";
import { MyActivityTab } from "@/components/features/my-activity";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "My Activity",
  description:
    "View personal task history, active share links, and direct download files.",
};

export default function ActivityPage() {
  return (
    <div className="w-full max-w-full">
      <ErrorBoundary title="Failed to load My Activity">
        <MyActivityTab />
      </ErrorBoundary>
    </div>
  );
}
