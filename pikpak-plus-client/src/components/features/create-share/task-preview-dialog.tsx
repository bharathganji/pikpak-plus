"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Share2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SupabaseTaskRecord } from "@/types";
import { formatFileSize, getTaskStatus } from "./task-utils";
import { LocalShare, SHARES_STORAGE_KEY } from "../downloads/activity/types";

interface TaskPreviewDialogProps {
  task: SupabaseTaskRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskPreviewDialog({
  task,
  open,
  onOpenChange,
}: Readonly<TaskPreviewDialogProps>) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState<{
    share_url: string;
    pass_code?: string;
  } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const copyToClipboard = (text: string, taskId?: number) => {
    navigator.clipboard.writeText(text);
    if (taskId) {
      setCopiedId(taskId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleShare = async () => {
    if (!task?.data.task?.task?.file_id) {
      setShareError("File ID not available. Task may not be completed yet.");
      return;
    }

    setShareLoading(true);
    setShareError(null);
    setShareData(null);

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/share`, {
        id: task.data.task.task.file_id,
        email: "user@example.com", // TODO: Get from auth context
        server_number: 0, // TODO: Get from user context
      });

      const shareResult = response.data;
      setShareData(shareResult);

      // Save to localStorage for My Activity tab
      const newShare: LocalShare = {
        id: shareResult.share_id || `share-${Date.now()}`,
        file_name: taskData?.file_name || "Unknown File",
        share_url: shareResult.share_url,
        pass_code: shareResult.pass_code,
        timestamp: Date.now(),
        file_id: task.data.task.task.file_id,
      };

      const existingShares = localStorage.getItem(SHARES_STORAGE_KEY);
      const shares: LocalShare[] = existingShares
        ? JSON.parse(existingShares)
        : [];
      shares.unshift(newShare); // Add to beginning
      localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify(shares));
    } catch (error: any) {
      setShareError(
        error.response?.data?.error || "Failed to create share link"
      );
    } finally {
      setShareLoading(false);
    }
  };

  // Reset share state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShareData(null);
      setShareError(null);
    }
    onOpenChange(newOpen);
  };

  if (!task) return null;

  const taskData = task.data.task?.task;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            Detailed information about this download task
          </DialogDescription>
        </DialogHeader>
        {/* File Name */}
        <div>
          <h4 className="text-sm font-semibold mb-1">File Name</h4>
          <p className="text-sm text-muted-foreground break-all">
            {taskData?.file_name || "N/A"}
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2">
          {/* Size */}
          {taskData?.file_size && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Size</h4>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(taskData.file_size)}
              </p>
            </div>
          )}

          {/* Magnet URL */}
          <div>
            <h4 className="text-sm font-semibold mb-1">Magnet URL</h4>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground break-all flex-1 font-mono">
                {task.data.url}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(task.data.url, task.id)}
                className="shrink-0 h-8"
              >
                {copiedId === task.id ? (
                  <span className="text-xs">Copied!</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          {/* Added */}
          <div>
            <h4 className="text-sm font-semibold mb-1">Added</h4>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(task.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>

          {/* Progress */}
          {taskData?.progress !== undefined && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Progress</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${taskData.progress}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {taskData.progress}%
                </span>
              </div>
            </div>
          )}

          {/* Status */}
          {taskData?.phase && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Status</h4>
              <Badge variant={getTaskStatus(task).variant}>
                {getTaskStatus(task).label}
              </Badge>
            </div>
          )}

          {/* Share Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Share File</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={shareLoading || !taskData?.file_id}
                className="gap-2"
              >
                <Share2 className="h-3 w-3" />
                {shareLoading ? "Creating..." : "Create Share Link"}
              </Button>
            </div>

            {/* Warning about cleanup */}
            <Alert variant="warning" className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Share links are stored in your activity section but will stop
                working after the server cleanup job runs. Download files before
                cleanup to ensure access.
              </AlertDescription>
            </Alert>

            {/* Share Error */}
            {shareError && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{shareError}</AlertDescription>
              </Alert>
            )}

            {/* Share Link Display */}
            {shareData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground break-all flex-1 font-mono bg-muted p-2 rounded">
                    {shareData.share_url}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(shareData.share_url, task.id + 1000)
                    }
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
