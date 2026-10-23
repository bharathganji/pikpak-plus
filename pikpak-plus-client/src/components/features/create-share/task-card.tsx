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
  Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseTaskRecord } from "@/types";
import { fileService } from "@/services/file-service";
import { Button } from "@/components/ui/button";
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
    return <FolderIcon className="h-7 w-7 text-yellow-500" />;
  }

  const fileType = task.data.whatslink?.file_type;

  switch (fileType) {
    case "video":
      return <VideoIcon className="h-7 w-7 text-purple-500" />;
    case "audio":
      return <MusicIcon className="h-7 w-7 text-green-500" />;
    case "archive":
      return <ArchiveIcon className="h-7 w-7 text-orange-500" />;
    case "image":
      return <ImageIcon className="h-7 w-7 text-pink-500" />;
    case "document":
    case "text":
      return <FileTextIcon className="h-7 w-7 text-blue-400" />;
    default:
      return <FileIcon className="h-7 w-7 text-blue-500" />;
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

  const handleDirectDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!taskData?.file_id) return;
    try {
      await fileService.downloadFile(taskData.file_id, name);
    } catch (err) {
      console.error("Direct download failed", err);
    }
  };

  return (
    <button
      type="button"
      className={`flex items-center gap-2.5 p-2.5 rounded-md border transition-all duration-200 hover:bg-accent/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full text-left ${
        isLocal ? "bg-primary/5 border-primary/20" : ""
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
            {taskData?.file_id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDirectDownload}
                title="Direct Download"
                className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
              className="text-[10px] h-4 px-1.5 whitespace-nowrap"
            >
              {status.label}
            </Badge>
            {isLocal && (
              <>
                <span className="text-[11px] text-muted-foreground">•</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 px-1.5 whitespace-nowrap"
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
            <div className="mt-2">
              <Progress value={taskData?.progress || 0} className="h-1" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
