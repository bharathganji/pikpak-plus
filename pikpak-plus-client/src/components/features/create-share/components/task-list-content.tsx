/**
 * Task list content component
 */

import React, { useMemo } from "react";
import type { SupabaseTaskRecord } from "@/types";
import { TaskCard } from "../task-card";
import { calculateAnimationDelay } from "../utils/pagination-utils";

interface TaskListContentProps {
  readonly tasks: readonly SupabaseTaskRecord[];
  readonly localTaskUrls?: readonly string[];
  readonly onTaskPreview: (task: SupabaseTaskRecord) => void;
}

interface TaskWithLocalFlag extends SupabaseTaskRecord {
  isLocal: boolean;
}

export const TaskListContent = React.memo(function TaskListContent({
  tasks,
  localTaskUrls,
  onTaskPreview,
}: Readonly<TaskListContentProps>) {
  const tasksWithLocalFlag = useMemo((): readonly TaskWithLocalFlag[] => {
    return tasks.map((task) => ({
      ...task,
      isLocal: localTaskUrls?.includes(task.data.url) || false,
    }));
  }, [tasks, localTaskUrls]);

  return (
    <div className="space-y-1.5 overflow-hidden">
      {tasksWithLocalFlag.map((task, index) => {
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
              isLocal={task.isLocal}
              onClick={() => onTaskPreview(task)}
            />
          </div>
        );
      })}
    </div>
  );
});
