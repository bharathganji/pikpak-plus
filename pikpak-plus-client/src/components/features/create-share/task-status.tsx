import { Badge } from "@/components/ui/badge";
import type { SupabaseTaskRecord } from "@/types";
import { getTaskStatus } from "./task-utils";

interface TaskStatusProps {
  task: SupabaseTaskRecord;
}

export function TaskStatus({ task }: Readonly<TaskStatusProps>) {
  const taskData = task.data.task?.task;

  return (
    <div className="space-y-4">
      {/* Progress */}
      {taskData?.progress !== undefined && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold tracking-tight">Progress</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${taskData.progress}%` }}
              />
            </div>
            <span className="text-sm font-mono font-medium text-muted-foreground tabular-nums">
              {taskData.progress}%
            </span>
          </div>
        </div>
      )}

      {/* Status */}
      {taskData?.phase && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold tracking-tight">Status</h4>
          <Badge variant={getTaskStatus(task).variant} className="shadow-xs font-medium">
            {getTaskStatus(task).label}
          </Badge>
          {/* Show PikPak message if different from status label */}
          {taskData?.message &&
            getTaskStatus(task).label !== taskData.message && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted/40 border border-border/40 p-2.5 rounded-lg">
                <span className="font-medium text-foreground">PikPak:</span> {taskData.message}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
