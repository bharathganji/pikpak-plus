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
        <div className="p-3 rounded-full bg-primary/10 text-primary animate-pulse-slow">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Loading WebDAV clients...
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={loading}
          className="transition-smooth active:scale-95"
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
    <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-destructive shadow-xs">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <AlertDescription className="text-sm font-medium">
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
          ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 shadow-xs"
          : "border-border/60 bg-card/60 shadow-xs"
      }
      variant={isTrafficIssue ? undefined : "default"}
    >
      {isTrafficIssue ? (
        <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      ) : (
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <AlertDescription
        className={
          isTrafficIssue
            ? "text-amber-950 dark:text-amber-100 text-sm font-medium"
            : "text-muted-foreground text-sm font-medium"
        }
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
    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 shadow-xs">
      <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-950 dark:text-amber-100 text-sm font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
}
