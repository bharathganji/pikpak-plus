import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseTaskRecord } from "@/types";
import { formatFileSize } from "./task-utils";

interface FileDetailsProps {
  task: SupabaseTaskRecord;
  copyToClipboard: (text: string, taskId?: number) => void;
  copiedId: number | null;
}

export function FileDetails({
  task,
  copyToClipboard,
  copiedId,
}: Readonly<FileDetailsProps>) {
  const taskData = task.data.task?.task;

  return (
    <div className="space-y-4 overflow-y-auto pr-2">
      {/* File Name */}
      <div>
        <h4 className="text-sm font-semibold mb-1">File Name</h4>
        <p className="text-sm text-muted-foreground break-all">
          {taskData?.file_name || "N/A"}
        </p>
      </div>

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
            onClick={() => {
              copyToClipboard(task.data.url, task.id);
            }}
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
    </div>
  );
}
