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
      variant={isTrafficIssue ? "warning" : "default"}
      className={
        isTrafficIssue
          ? "shadow-xs"
          : "border-border/60 bg-card/60 shadow-xs"
      }
    >
      {isTrafficIssue ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <AlertDescription
        className={
          isTrafficIssue
            ? "text-sm font-medium"
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
    <Alert variant="warning" className="shadow-xs">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="text-sm font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
}
