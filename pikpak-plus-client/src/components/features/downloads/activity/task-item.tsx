import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalTask } from "./types";
import { formatTimeAgo, formatFileSize } from "./utils";

interface TaskItemProps {
  task: LocalTask;
  onDelete: (taskId: string) => void;
}

export function TaskItem({ task, onDelete }: TaskItemProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border/50">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-medium truncate text-sm"
            title={task.name || "Processing..."}
          >
            {task.name || "Processing..."}
          </p>
          <p
            className="text-xs text-muted-foreground truncate mt-1"
            title={task.url}
          >
            {task.url}
          </p>
          {(task.file_size || task.file_type) && (
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              {task.file_type && (
                <span className="capitalize">{task.file_type}</span>
              )}
              {task.file_size && <span>{formatFileSize(task.file_size)}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {task.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Added {new Date(task.timestamp).toLocaleString()}</span>
        <span>{formatTimeAgo(task.timestamp)}</span>
      </div>
    </div>
  );
}
