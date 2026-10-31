import type { Metadata } from "next";
import { DownloadsTab } from "@/components/features/downloads/downloads-tab";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "Downloads & WebDAV",
  description:
    "View storage quota, WebDAV connection details, and media streaming setups.",
};

export default function DownloadsPage() {
  return (
    <div className="w-full max-w-full">
      <ErrorBoundary title="Failed to load Downloads">
        <DownloadsTab />
      </ErrorBoundary>
    </div>
  );
}
