"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SupabaseTaskRecord } from "@/types";
import copy from "copy-to-clipboard";
import { ShareSection } from "./share-section";
import { FileDetails } from "./file-details";
import { TaskStatus } from "./task-status";

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

  const copyToClipboard = (text: string, taskId?: number) => {
    copy(text);
    if (taskId) {
      setCopiedId(taskId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Reset share state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Share state is now managed internally by ShareSection component
    }
    onOpenChange(newOpen);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            Detailed information about this download task
          </DialogDescription>
        </DialogHeader>
        <FileDetails
          task={task}
          copyToClipboard={copyToClipboard}
          copiedId={copiedId}
        />
        <TaskStatus task={task} />
        <ShareSection
          task={task}
          copyToClipboard={copyToClipboard}
          copiedId={copiedId}
        />
      </DialogContent>
    </Dialog>
  );
}
