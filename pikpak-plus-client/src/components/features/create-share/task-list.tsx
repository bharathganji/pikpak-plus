"use client";

import React, { useMemo } from "react";
import type { SupabaseTaskRecord } from "@/types";
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
  readonly localTaskUrls?: readonly string[];
  readonly loading: boolean;
  readonly error?: string;
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
  readonly showMyTasksOnly: boolean;
  readonly onFilterChange: (show: boolean) => void;
}

export const TaskList = React.memo(function TaskList(
  props: Readonly<TaskListProps>,
) {
  const {
    tasks,
    localTaskUrls,
    loading,
    error,
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    showMyTasksOnly,
    onFilterChange,
  } = props;

  // State management hooks
  const { nsfwFilterEnabled, toggleFilter } = useNsfwFilter();
  const { handlePreview, previewTask, previewOpen, setPreviewOpen } =
    useTaskPreview();

  // Task filtering logic
  const { filteredTasks } = useTaskFilter(
    tasks,
    nsfwFilterEnabled,
    localTaskUrls,
  );

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
    showMyTasksOnly,
    nsfwFilterEnabled,
    page,
  );

  // Memoized task content component
  const taskContent = useMemo(() => {
    if (loading || error || emptyMessage) {
      return null;
    }

    return (
      <TaskListContent
        tasks={filteredTasks}
        localTaskUrls={localTaskUrls}
        onTaskPreview={handlePreview}
      />
    );
  }, [
    loading,
    error,
    emptyMessage,
    filteredTasks,
    localTaskUrls,
    handlePreview,
  ]);

  // Content based on loading/error/empty states
  let content: React.ReactNode;

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
    content = taskContent;
  }

  // Pagination configuration
  const paginationVariant = useMemo(() => {
    return selectPaginationVariant(totalPages);
  }, [totalPages]);

  // Should show pagination (not when loading, error, or showing my tasks only)
  const shouldShowPagination =
    !loading && !error && !showMyTasksOnly && totalPages > 1;

  return (
    <div className="space-y-3">
      {/* Filter Toggle Controls */}
      <FilterControls
        showMyTasksOnly={showMyTasksOnly}
        onFilterChange={onFilterChange}
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
