import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileIcon,
  FolderIcon,
  VideoIcon,
  MusicIcon,
  ArchiveIcon,
  ImageIcon,
  FileTextIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseTaskRecord } from "@/types";
import {
  formatFileSize,
  getTaskStatus,
  isFolder,
  getTaskName,
  isTaskCompleted,
} from "./task-utils";

interface TaskCardProps {
  task: SupabaseTaskRecord;
  isLocal: boolean;
  onClick: () => void;
}

/**
 * Get the appropriate icon component based on WhatsLink file_type or folder status
 */
function getFileIcon(task: SupabaseTaskRecord, isFolderType: boolean) {
  if (isFolderType) {
    return (
      <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
        <FolderIcon className="h-6 w-6 text-yellow-500" />
      </div>
    );
  }

  const fileType = task.data.whatslink?.file_type;

  switch (fileType) {
    case "video":
      return (
        <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
          <VideoIcon className="h-6 w-6 text-purple-500" />
        </div>
      );
    case "audio":
      return (
        <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
          <MusicIcon className="h-6 w-6 text-green-500" />
        </div>
      );
    case "archive":
      return (
        <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
          <ArchiveIcon className="h-6 w-6 text-orange-500" />
        </div>
      );
    case "image":
      return (
        <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
          <ImageIcon className="h-6 w-6 text-pink-500" />
        </div>
      );
    case "document":
    case "text":
      return (
        <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
          <FileTextIcon className="h-6 w-6 text-blue-400" />
        </div>
      );
    default:
      return (
        <div className="p-2 rounded-lg bg-muted/60 dark:bg-muted/40 shrink-0">
          <FileIcon className="h-6 w-6 text-blue-500" />
        </div>
      );
  }
}

export function TaskCard({ task, isLocal, onClick }: Readonly<TaskCardProps>) {
  const name = getTaskName(task);
  const taskData = task.data.task?.task;
  const fileSize = formatFileSize(taskData?.file_size);
  const status = getTaskStatus(task);
  const isFolderType = isFolder(task);
  const fileCount = task.data.whatslink?.count;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={`flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent/40 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer w-full text-left ${
        isLocal ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10" : "bg-card"
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="shrink-0">{getFileIcon(task, isFolderType)}</div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="w-full">
          <div className="flex items-center justify-between gap-2">
            <h4
              className="font-medium text-sm truncate leading-tight flex-1"
              title={name}
            >
              {name}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {fileSize}
            </span>
            {fileCount && fileCount > 1 && (
              <>
                <span className="text-[11px] text-muted-foreground">•</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {fileCount} files
                </span>
              </>
            )}
            <span className="text-[11px] text-muted-foreground">•</span>
            <Badge
              variant={status.variant}
              className="text-[10px] h-4.5 px-2 font-medium whitespace-nowrap shadow-xs"
            >
              {status.label}
            </Badge>
            {isLocal && (
              <>
                <span className="text-[11px] text-muted-foreground">•</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4.5 px-2 font-medium whitespace-nowrap shadow-xs"
                >
                  My Task
                </Badge>
              </>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Added{" "}
            {formatDistanceToNow(new Date(task.created_at), {
              addSuffix: true,
            })}
          </div>
          {!isTaskCompleted(task) && (
            <div className="mt-2.5">
              <Progress value={taskData?.progress || 0} className="h-1.5 rounded-full overflow-hidden" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
