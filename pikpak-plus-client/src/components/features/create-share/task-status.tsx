import { Badge } from "@/components/ui/badge";
import type { SupabaseTaskRecord } from "@/types";
import { getTaskStatus } from "./task-utils";

interface TaskStatusProps {
  task: SupabaseTaskRecord;
}

export function TaskStatus({ task }: Readonly<TaskStatusProps>) {
  const taskData = task.data.task?.task;

  return (
    <div>
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
    </div>
  );
}
