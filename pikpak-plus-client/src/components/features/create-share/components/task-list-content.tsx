/**
 * Task list content component
 */

import React from "react";
import type { SupabaseTaskRecord } from "@/types";
import { TaskCard } from "../task-card";
import { calculateAnimationDelay } from "../utils/pagination-utils";
import { VirtualList } from "@/components/ui/virtual-list";

interface TaskListContentProps {
  readonly tasks: readonly SupabaseTaskRecord[];
  readonly onTaskPreview: (task: SupabaseTaskRecord) => void;
}

export const TaskListContent = React.memo(function TaskListContent({
  tasks,
  onTaskPreview,
}: Readonly<TaskListContentProps>) {
  if (tasks.length > 20) {
    return (
      <VirtualList
        items={tasks}
        itemHeight={78}
        height={480}
        keyExtractor={(task) => task.id}
        innerClassName="space-y-1.5"
        renderItem={(task) => (
          <div key={task.id} className="pb-1.5">
            <TaskCard
              task={task}
              isLocal={true}
              onClick={() => onTaskPreview(task)}
            />
          </div>
        )}
      />
    );
  }

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
