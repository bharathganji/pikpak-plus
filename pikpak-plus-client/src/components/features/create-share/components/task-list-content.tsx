/**
 * Task list content component
 */

import React, { useMemo } from "react";
import type { SupabaseTaskRecord } from "@/types";
import { TaskCard } from "../task-card";
import { calculateAnimationDelay } from "../utils/pagination-utils";

interface TaskListContentProps {
  readonly tasks: readonly SupabaseTaskRecord[];
  readonly onTaskPreview: (task: SupabaseTaskRecord) => void;
}

export const TaskListContent = React.memo(function TaskListContent({
  tasks,
  onTaskPreview,
}: Readonly<TaskListContentProps>) {
  return (
    <div className="space-y-1.5 overflow-hidden">
      {tasks.map((task, index) => {
        const animationDelay = calculateAnimationDelay(index);

        return (
          <div
            key={task.id}
            className="animate-slide-up"
            style={{
              animationDelay: animationDelay,
              animationFillMode: "both",
            }}
          >
            <TaskCard
              task={task}
              isLocal={true}
              onClick={() => onTaskPreview(task)}
            />
          </div>
        );
      })}
    </div>
  );
});
