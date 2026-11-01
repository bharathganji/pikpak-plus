"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Share2,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api-utils";
import axios from "axios";
import type { SupabaseTaskRecord } from "@/types";

interface ShareSectionProps {
  task: SupabaseTaskRecord;
  copyToClipboard: (text: string, taskId?: number) => void;
  copiedId: number | null;
}

// Helper function to get user-friendly error messages
const getUserFriendlyError = (error: any): string => {
  // Network errors
  if (!error.response) {
    return "Unable to connect. Please check your internet connection.";
  }

  // HTTP status codes
  const status = error.response?.status;
  if (status === 403 || status === 401) {
    return "You don't have permission to share this file.";
  }
  if (status >= 500) {
    return "Server is temporarily unavailable. Please try again later.";
  }

  // Use API error message if available, otherwise generic message
  const apiError = error.response?.data?.error;
  if (apiError && typeof apiError === "string") {
    // Simplify technical error messages
    if (apiError.toLowerCase().includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    if (apiError.toLowerCase().includes("not found")) {
      return "File not found. It may have been deleted.";
    }
    return apiError;
  }

  return "Failed to create share link. Please try again.";
};

export function ShareSection({
  task,
  copyToClipboard,
  copiedId,
}: Readonly<ShareSectionProps>) {
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState<{
    share_url: string;
    pass_code?: string;
    is_existing?: boolean;
  } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [expirationDays, setExpirationDays] = useState(-1);

  const taskData = task.data.task?.task;
  const hasFileId = !!taskData?.file_id;
  const taskProgress = taskData?.progress || 0;
  const isError = taskData?.phase === "PHASE_TYPE_ERROR";

  const handleShare = async () => {
    if (!taskData?.file_id) {
      setShareError("File ID not available. Task may not be completed yet.");
      return;
    }

    setShareLoading(true);
    setShareError(null);

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(
        `${apiUrl}/share`,
        {
          id: taskData.file_id,
          file_name: taskData?.file_name,
          need_password: needPassword,
          expiration_days: expirationDays,
        },
        { withCredentials: true },
      );

      const shareResult = response.data;
      setShareData(shareResult);
    } catch (error: any) {
      const friendlyError = getUserFriendlyError(error);
      setShareError(friendlyError);
    } finally {
      setShareLoading(false);
    }
  };

  const handleRetry = () => {
    setShareError(null);
    handleShare();
  };

  return (
    <div className="border-t border-border/60 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold tracking-tight">Share File</h4>
      </div>

      {/* Visual Status Indicator - Fix 4 */}
      <div className="mb-3">
        {isError ? (
          <div className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive border border-destructive/20 p-2.5 rounded-lg shadow-2xs">
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="font-medium">Task Failed</span>
          </div>
        ) : hasFileId ? (
          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 p-2.5 rounded-lg shadow-2xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Ready to Share</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 p-2.5 rounded-lg shadow-2xs">
            <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <span className="font-medium">Task in Progress</span>
              {taskProgress > 0 && (
                <span className="ml-2 text-xs opacity-90">
                  ({taskProgress}% complete)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Warning */}
      {!hasFileId && !isError && (
        <Alert variant="warning" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Task is still in progress. Share will be available once download
            completes.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Warning */}
      {isError && (
        <Alert variant="destructive" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Task has failed. Cannot generate share link.
          </AlertDescription>
        </Alert>
      )}

      {/* API Error Display */}
      {shareError && (
        <Alert variant="destructive" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>{shareError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-7 text-xs shadow-2xs"
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Share Link Display - Above Button */}
      {shareData && (
        <div className="space-y-2 mb-3">
          {/* Indicator for existing vs new share - Active Deduplicated Share Pill */}
          {shareData.is_existing && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Badge
                variant="secondary"
                className="gap-1 border border-border/60 text-[11px] font-normal"
              >
                <Info className="h-3 w-3" />
                <span>Existing share link</span>
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-1.5 shadow-2xs">
            <p className="text-xs text-foreground/90 break-all flex-1 font-mono px-2 py-1">
              {shareData.share_url}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                copyToClipboard(shareData.share_url, task.id + 1000);
              }}
              className="shrink-0 h-8 shadow-2xs"
            >
              {copiedId === task.id + 1000 ? (
                <span className="text-xs font-medium">Copied!</span>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          {shareData.pass_code && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground">Password:</span>
              <span className="font-mono font-semibold text-foreground bg-background/80 px-2 py-0.5 rounded border border-border/50">
                {shareData.pass_code}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Share Options */}
      {hasFileId && !shareData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 p-3 bg-muted/30 rounded-lg border border-border/60 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={needPassword}
              onChange={(e) => setNeedPassword(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary/20"
            />
            <span className="font-medium">Require Passcode</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground whitespace-nowrap">
              Expires:
            </span>
            <select
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value={-1}>Permanent</option>
              <option value={1}>1 Day</option>
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
        </div>
      )}

      {/* Create Share Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={shareLoading || !hasFileId}
        className="gap-2 w-full shadow-2xs"
      >
        {shareLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" />
            {shareData?.is_existing
              ? "View Existing Share"
              : shareData
                ? "Refresh Share Link"
                : "Create Share Link"}
          </>
        )}
      </Button>

      {/* Warning about cleanup */}
      <Alert variant="warning" className="mt-3">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Share links are stored in your activity section but will stop working
          after the server cleanup job runs. Download files before cleanup to
          ensure access.
        </AlertDescription>
      </Alert>
    </div>
  );
}
