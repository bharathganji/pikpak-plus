import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileIcon, FolderIcon } from "lucide-react";
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

export function TaskCard({ task, isLocal, onClick }: Readonly<TaskCardProps>) {
  const name = getTaskName(task);
  const taskData = task.data.task?.task;
  const fileSize = formatFileSize(taskData?.file_size);
  const status = getTaskStatus(task);
  const isFolderType = isFolder(task);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={`flex items-center gap-2.5 p-2.5 rounded-md border transition-colors hover:bg-accent/50 cursor-pointer w-full text-left ${
        isLocal ? "bg-primary/5 border-primary/20" : ""
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="shrink-0">
        {isFolderType ? (
          <FolderIcon className="h-7 w-7 text-yellow-500" />
        ) : (
          <FileIcon className="h-7 w-7 text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="w-full">
          <h4
            className="font-medium text-sm truncate leading-tight"
            title={name}
          >
            {name}
          </h4>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {fileSize}
            </span>
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
