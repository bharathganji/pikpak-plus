"use client";

import { useState } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Share2,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api-utils";
import axios from "axios";
import type { SupabaseTaskRecord } from "@/types";
import { LocalShare, LOCAL_SHARES_STORAGE_KEY } from "../my-activity/types";

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
  const [shares, setShares] = useLocalStorage<LocalShare[]>(
    [],
    LOCAL_SHARES_STORAGE_KEY,
  );

  const taskData = task.data.task?.task;
  const hasFileId = !!taskData?.file_id;
  const taskProgress = taskData?.progress || 0;

  const saveToLocalStorage = (shareResult: any, fileId: string) => {
    const newShare: LocalShare = {
      id: shareResult.share_id || `share-${Date.now()}`,
      file_name: taskData?.file_name || "Unknown File",
      share_url: shareResult.share_url,
      pass_code: shareResult.pass_code,
      timestamp: Date.now(),
      file_id: fileId,
    };

    // Check if share already exists
    const alreadyExists = shares.some((s) => s.file_id === fileId);
    if (!alreadyExists) {
      setShares([newShare, ...shares]);
    }
  };

  const handleShare = async () => {
    if (!taskData?.file_id) {
      setShareError("File ID not available. Task may not be completed yet.");
      return;
    }

    setShareLoading(true);
    setShareError(null);

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/share`, {
        id: taskData.file_id,
      });

      const shareResult = response.data;
      setShareData(shareResult);

      // Save to localStorage if it's a new share
      if (!shareResult.is_existing) {
        saveToLocalStorage(shareResult, taskData.file_id);
      }
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
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Share File</h4>
      </div>

      {/* Visual Status Indicator - Fix 4 */}
      <div className="mb-3">
        {hasFileId ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/30 p-2 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">✓ Ready to Share</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-950/30 p-2 rounded-md">
            <Clock className="h-4 w-4" />
            <div className="flex-1">
              <span className="font-medium">⏳ Task in Progress</span>
              {taskProgress > 0 && (
                <span className="ml-2 text-xs opacity-80">
                  ({taskProgress}% complete)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Warning - Fix 2 */}
      {!hasFileId && (
        <Alert variant="warning" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⏳ Task is still in progress. Share will be available once download
            completes.
          </AlertDescription>
        </Alert>
      )}

      {/* API Error Display - Fix 3 */}
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
                className="h-7 text-xs"
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
          {/* Indicator for existing vs new share */}
          {shareData.is_existing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Info className="h-3 w-3" />
              <span>Existing share link</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground break-all flex-1 font-mono bg-muted p-2 rounded">
              {shareData.share_url}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                copyToClipboard(shareData.share_url, task.id + 1000);
              }}
              className="shrink-0 h-8"
            >
              {copiedId === task.id + 1000 ? (
                <span className="text-xs">Copied!</span>
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          {shareData.pass_code && (
            <div className="text-sm">
              <span className="font-semibold">Password: </span>
              <span className="font-mono bg-muted px-2 py-1 rounded">
                {shareData.pass_code}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Create Share Button - Fix 1: Stable structure to prevent flicker */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={shareLoading || !hasFileId || shareData?.is_existing}
        className="gap-2 w-full"
      >
        {shareLoading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Creating...
          </>
        ) : shareData?.is_existing ? (
          <>
            <Share2 className="h-3 w-3" />
            Share Link Already Exists
          </>
        ) : (
          <>
            <Share2 className="h-3 w-3" />
            {shareData ? "Refresh Share Link" : "Create Share Link"}
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
