"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, WifiOff } from "lucide-react";

interface LoadingStateProps {
  readonly onRetry: () => void;
  readonly loading: boolean;
}

export function WebDAVLoadingState({ onRetry, loading }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading WebDAV clients...
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={loading}
        >
          Retry
        </Button>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  readonly error: string;
}

export function WebDAVErrorState({ error }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Failed to load WebDAV clients: {error}
      </AlertDescription>
    </Alert>
  );
}

interface EmptyStateProps {
  readonly message?: string;
  readonly isTrafficIssue?: boolean;
}

export function WebDAVEmptyState({
  message,
  isTrafficIssue = false,
}: EmptyStateProps) {
  return (
    <Alert
      className={
        isTrafficIssue
          ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20"
          : ""
      }
      variant={isTrafficIssue ? undefined : "default"}
    >
      {isTrafficIssue ? (
        <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertDescription
        className={isTrafficIssue ? "text-orange-900 dark:text-orange-200" : ""}
      >
        {message ||
          "No WebDAV clients currently active. They will be created on the next scheduled run."}
      </AlertDescription>
    </Alert>
  );
}

interface TrafficWarningProps {
  readonly message: string;
}

export function WebDAVTrafficWarning({ message }: TrafficWarningProps) {
  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="text-orange-900 dark:text-orange-200">
        {message}
      </AlertDescription>
    </Alert>
  );
}
