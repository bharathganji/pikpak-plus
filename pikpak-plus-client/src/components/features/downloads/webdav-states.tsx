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
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
          : ""
      }
      variant={isTrafficIssue ? undefined : "default"}
    >
      {isTrafficIssue ? (
        <WifiOff className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertDescription
        className={isTrafficIssue ? "text-amber-950 dark:text-amber-100" : ""}
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
    <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <WifiOff className="h-4 w-4 text-amber-700 dark:text-amber-300" />
      <AlertDescription className="text-amber-950 dark:text-amber-100">
        {message}
      </AlertDescription>
    </Alert>
  );
}
