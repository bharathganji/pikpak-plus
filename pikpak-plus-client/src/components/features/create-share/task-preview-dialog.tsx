"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
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

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            Detailed information about this download task
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 space-y-4">
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
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <XIcon className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
