"use client";

import { useState } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Filter as BadWordsFilter } from "bad-words";
import type { SupabaseTaskRecord } from "@/types";
import { TaskCard } from "./task-card";
import { TaskPreviewDialog } from "./task-preview-dialog";
import { getTaskName } from "./task-utils";

interface TaskListProps {
  tasks: SupabaseTaskRecord[];
  localTaskUrls?: string[];
  loading: boolean;
  error?: string;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  showMyTasksOnly: boolean;
  onFilterChange: (show: boolean) => void;
}

export function TaskList({
  tasks,
  localTaskUrls,
  loading,
  error,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showMyTasksOnly,
  onFilterChange,
}: Readonly<TaskListProps>) {
  const [previewTask, setPreviewTask] = useState<SupabaseTaskRecord | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nsfwFilterEnabled, setNsfwFilterEnabled] = useLocalStorage(
    false,
    "nsfwFilterEnabled"
  );

  const handlePreview = (task: SupabaseTaskRecord) => {
    setPreviewTask(task);
    setPreviewOpen(true);
  };

  let filteredTasks = tasks;
  // Client-side filtering for My Tasks is removed as it's now handled by API

  if (nsfwFilterEnabled) {
    const filter = new BadWordsFilter({});
    filteredTasks = filteredTasks.filter(
      (task) => !filter.isProfane(getTaskName(task))
    );
  }

  // Helper to determine the empty state message
  const getEmptyStateMessage = () => {
    if (tasks.length === 0) {
      if (showMyTasksOnly) {
        return "You haven't added any tasks yet.";
      }
      if (page > 1) {
        return "No tasks on this page.";
      }
      return "No tasks found.";
    }

    if (filteredTasks.length === 0) {
      if (nsfwFilterEnabled) {
        return "No tasks match your filters.";
      }
      return "No tasks match your criteria.";
    }

    return null;
  };

  const emptyMessage = getEmptyStateMessage();

  let content;
  if (loading) {
    content = (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Loading tasks...
      </div>
    );
  } else if (error) {
    content = (
      <div className="text-center py-6 text-destructive">
        <p className="font-medium text-sm">Error loading tasks</p>
        <p className="text-xs opacity-80 mt-1">{error}</p>
      </div>
    );
  } else if (emptyMessage) {
    content = (
      <div className="text-center py-6 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  } else {
    content = (
      <div className="space-y-1.5 overflow-hidden">
        {filteredTasks.map((task, index) => {
          const isLocal = localTaskUrls?.includes(task.data.url) || false;
          return (
            <div
              key={task.id}
              className="animate-slide-up"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: "both",
              }}
            >
              <TaskCard
                task={task}
                isLocal={isLocal}
                onClick={() => handlePreview(task)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter Toggle */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={showMyTasksOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(!showMyTasksOnly)}
          className="gap-2 h-8"
        >
          <Filter className="h-3 w-3" />
          {showMyTasksOnly ? "Show All Tasks" : "My Tasks Only"}
        </Button>
        <Button
          variant={nsfwFilterEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => setNsfwFilterEnabled(!nsfwFilterEnabled)}
          className="gap-2 h-8"
        >
          <Filter className="h-3 w-3" />
          NSFW Filter
        </Button>
      </div>

      {/* Content */}
      {content}

      {/* Enhanced Pagination - Always visible unless loading or error OR showing my tasks */}
      {!loading && !error && !showMyTasksOnly && (
        <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground pt-2 w-full">
          {/* Page Info and Size Selector */}
          <div className="flex items-center gap-2 flex-wrap justify-center w-full">
            <span>
              Showing {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, tasks.length)} of {tasks.length} tasks
            </span>
            <span>·</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          {/* Enhanced Navigation Controls - Compact and centered */}
          <div className="flex flex-wrap items-center gap-2 justify-center w-full">
            {/* First Page Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="h-8 px-2"
              aria-label="First page"
            >
              <ChevronLeft className="h-3 w-3" />
              <ChevronLeft className="h-3 w-3 -ml-1" />
            </Button>

            {/* Previous Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </Button>

            {/* Page Navigation Input */}
            <div className="flex items-center gap-1">
              <span>Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const newPage = Math.min(
                    Math.max(1, Number.parseInt(e.target.value) || 1),
                    totalPages
                  );
                  onPageChange(newPage);
                }}
                className="h-8 w-12 rounded-md border border-input bg-background px-2 text-xs text-center hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Go to page"
              />
              <span>of {totalPages}</span>
            </div>

            {/* Next Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-8"
              aria-label="Next page"
            >
              Next <ChevronRight className="h-3 w-3" />
            </Button>

            {/* Last Page Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="h-8 px-2"
              aria-label="Last page"
            >
              <ChevronRight className="h-3 w-3" />
              <ChevronRight className="h-3 w-3 -ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <TaskPreviewDialog
        task={previewTask}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
