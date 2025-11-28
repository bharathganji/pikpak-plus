"use client";

import { useState } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Loader2, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getApiUrl } from "@/lib/api-utils";
import axios from "axios";
import type { SupabaseTaskRecord } from "@/types";
import { LocalShare, SHARES_STORAGE_KEY } from "../my-activity/types";

interface ShareSectionProps {
  task: SupabaseTaskRecord;
  copyToClipboard: (text: string, taskId?: number) => void;
  copiedId: number | null;
}

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
    SHARES_STORAGE_KEY,
  );

  const taskData = task.data.task?.task;

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
      setShareError(
        error.response?.data?.error || "Failed to create share link",
      );
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Share File</h4>
      </div>

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

          {/* Share Error */}
          {shareError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{shareError}</AlertDescription>
            </Alert>
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

      {/* Create Share Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={shareLoading || shareData?.is_existing}
        className="gap-2 w-full"
      >
        {(() => {
          if (shareLoading) {
            return (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Creating...
              </>
            );
          } else if (shareData?.is_existing) {
            return (
              <>
                <Share2 className="h-3 w-3" />
                Share Link Already Exists
              </>
            );
          } else {
            const buttonText = shareData
              ? "Refresh Share Link"
              : "Create Share Link";
            return (
              <>
                <Share2 className="h-3 w-3" />
                {buttonText}
              </>
            );
          }
        })()}
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
