/**
 * Custom hooks for task list state management
 */

import { useState, useMemo, useCallback } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Filter as BadWordsFilter } from "bad-words";
import type { SupabaseTaskRecord } from "@/types";
import { getTaskName } from "../task-utils";
import { calculateItemRange } from "../utils/pagination-utils";

// Hook for managing NSFW filter state
export function useNsfwFilter() {
  const [nsfwFilterEnabled, setNsfwFilterEnabled] = useLocalStorage(
    false,
    "nsfwFilterEnabled"
  );

  const toggleFilter = useCallback(() => {
    setNsfwFilterEnabled(!nsfwFilterEnabled);
  }, [nsfwFilterEnabled, setNsfwFilterEnabled]);

  return {
    nsfwFilterEnabled,
    toggleFilter,
  };
}

// Hook for managing task filtering logic
export function useTaskFilter(
  tasks: readonly SupabaseTaskRecord[],
  nsfwFilterEnabled: boolean,
  localTaskUrls?: readonly string[]
) {
  // Memoize the BadWordsFilter instance to prevent recreating it on every render
  const badWordsFilter = useMemo(() => new BadWordsFilter({}), []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks]; // Create a copy to avoid mutating the original array

    // Apply NSFW filter
    if (nsfwFilterEnabled) {
      result = result.filter((task) => !badWordsFilter.isProfane(getTaskName(task)));
    }

    return result;
  }, [tasks, nsfwFilterEnabled, badWordsFilter]);

  const filteredTasksWithLocalFlag = useMemo(() => {
    return filteredTasks.map((task) => ({
      ...task,
      isLocal: localTaskUrls?.includes(task.data.url) || false,
    }));
  }, [filteredTasks, localTaskUrls]);

  return {
    filteredTasks,
    filteredTasksWithLocalFlag,
  };
}

// Hook for managing preview dialog state
export function useTaskPreview() {
  const [previewTask, setPreviewTask] = useState<SupabaseTaskRecord | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = useCallback((task: SupabaseTaskRecord) => {
    setPreviewTask(task);
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewTask(null);
  }, []);

  const openPreview = useCallback((task: SupabaseTaskRecord) => {
    setPreviewTask(task);
    setPreviewOpen(true);
  }, []);

  return {
    previewTask,
    previewOpen,
    handlePreview,
    closePreview,
    openPreview,
    setPreviewOpen,
  };
}

// Hook for managing empty state messages
export function useEmptyState(
  tasks: readonly SupabaseTaskRecord[],
  filteredTasks: readonly SupabaseTaskRecord[],
  loading: boolean,
  error: string | undefined,
  showMyTasksOnly: boolean,
  nsfwFilterEnabled: boolean,
  page: number
) {
  const emptyMessage = useMemo(() => {
    if (loading || error) {
      return null;
    }

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
  }, [
    tasks.length,
    filteredTasks.length,
    loading,
    error,
    showMyTasksOnly,
    nsfwFilterEnabled,
    page,
  ]);

  return {
    emptyMessage,
  };
}

// Hook for calculating item range display
export function useItemRange(
  page: number,
  pageSize: number,
  totalItems: number
) {
  const itemRange = useMemo(() => {
    return calculateItemRange(page, pageSize, totalItems);
  }, [page, pageSize, totalItems]);

  return {
    itemRange,
    showItemRange: totalItems > 0,
  };
}

// Hook for determining content state
export function useTaskContent(
  loading: boolean,
  error: string | undefined,
  emptyMessage: string | null
) {
  const contentType = useMemo(() => {
    if (loading) return "loading" as const;
    if (error) return "error" as const;
    if (emptyMessage) return "empty" as const;
    return "content" as const;
  }, [loading, error, emptyMessage]);

  return {
    contentType,
  };
}
