"use client";

import React, { useMemo } from "react";
import type { SupabaseTaskRecord } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskPreviewDialog } from "./task-preview-dialog";

// Import extracted components
import {
  FilterControls,
  TaskListContent,
  Pagination,
  PaginationInfo,
} from "./components";

// Import custom hooks
import {
  useNsfwFilter,
  useTaskFilter,
  useTaskPreview,
  useEmptyState,
} from "./hooks";

// Import utility functions
import { selectPaginationVariant } from "./utils/pagination-utils";

// Props interface with readonly modifiers for S6759 compliance
interface TaskListProps {
  readonly tasks: readonly SupabaseTaskRecord[];
  readonly loading: boolean;
  readonly error?: string;
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
}

export const TaskList = React.memo(function TaskList(
  props: Readonly<TaskListProps>,
) {
  const {
    tasks,
    loading,
    error,
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
  } = props;

  // State management hooks
  const { nsfwFilterEnabled, toggleFilter } = useNsfwFilter();
  const { handlePreview, previewTask, previewOpen, setPreviewOpen } =
    useTaskPreview();

  // Task filtering logic
  const { filteredTasks } = useTaskFilter(tasks, nsfwFilterEnabled);

  // Calculate filtered count (items removed by NSFW filter)
  const filteredCount = useMemo(() => {
    if (!nsfwFilterEnabled) return 0;
    return tasks.length - filteredTasks.length;
  }, [tasks.length, filteredTasks.length, nsfwFilterEnabled]);

  // Empty state management
  const { emptyMessage } = useEmptyState(
    tasks,
    filteredTasks,
    loading,
    error,
    nsfwFilterEnabled,
    page,
  );

  // Memoized task content component
  const taskContent = useMemo(() => {
    if (loading || error || emptyMessage) {
      return null;
    }

    return (
      <TaskListContent tasks={filteredTasks} onTaskPreview={handlePreview} />
    );
  }, [loading, error, emptyMessage, filteredTasks, handlePreview]);

  // Content based on loading/error/empty states
  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-sm">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Skeleton className="h-4 w-16 hidden sm:block" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
        ))}
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
    content = taskContent;
  }

  // Pagination configuration
  const paginationVariant = useMemo(() => {
    return selectPaginationVariant(totalPages);
  }, [totalPages]);

  // Should show pagination (not when loading or error)
  const shouldShowPagination = !loading && !error && totalPages > 1;

  return (
    <div className="space-y-3">
      {/* Filter Toggle Controls */}
      <FilterControls
        nsfwFilterEnabled={nsfwFilterEnabled}
        onNsfwFilterToggle={toggleFilter}
        filteredCount={filteredCount}
      />

      {/* Content Area */}
      {content}

      {/* Enhanced Pagination Section */}
      {shouldShowPagination && (
        <div className="flex flex-col items-center gap-3 pt-2 w-full">
          {/* Page Size Selector and Task Count Info */}
          <PaginationInfo
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageSizeChange={onPageSizeChange}
          />

          {/* Pagination Component */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            variant={paginationVariant}
            showPageInfo={true}
            className="w-full"
          />
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
});
