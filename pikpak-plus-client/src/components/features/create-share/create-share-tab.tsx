"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { MagnetInputCard } from "./magnet-input-card";
import { GlobalActivityCard } from "./global-activity-card";
import { fetchConfig, fetchCleanupStatus, fetchGlobalTasks } from "./api-utils";

export function CreateShareTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch config and cleanup status with TanStack Query
  const { data: configAndCleanup } = useQuery({
    queryKey: ["app-config-cleanup"],
    queryFn: async () => {
      try {
        const [configData, cleanupData] = await Promise.all([
          fetchConfig(),
          fetchCleanupStatus(),
        ]);
        return { configData, cleanupData };
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        return {
          configData: {
            max_file_size_gb: 25,
            task_status_update_interval_minutes: 15,
            next_task_status_update: null,
          },
          cleanupData: null,
        };
      }
    },
  });

  const cleanupStatus = configAndCleanup?.cleanupData ?? null;
  const maxFileSizeGB = configAndCleanup?.configData?.max_file_size_gb ?? null;
  const taskStatusUpdateIntervalMinutes =
    configAndCleanup?.configData?.task_status_update_interval_minutes ?? null;
  const nextTaskStatusUpdate =
    configAndCleanup?.configData?.next_task_status_update ?? null;

  // Derived time until cleanup using useMemo
  const timeUntilCleanup = useMemo(() => {
    if (!cleanupStatus?.next_cleanup) return "";

    const now = new Date();
    const next = new Date(cleanupStatus.next_cleanup);
    const diff = next.getTime() - now.getTime();

    if (diff <= 0) {
      return "Soon";
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [cleanupStatus]);

  // Fetch global tasks with TanStack Query
  const {
    data: tasksResult,
    isLoading: globalTasksLoading,
    error: globalTasksErrorObj,
  } = useQuery({
    queryKey: ["global-tasks", page, pageSize],
    queryFn: () => fetchGlobalTasks(page, pageSize),
    placeholderData: keepPreviousData,
  });

  const globalTasks = tasksResult?.data ?? [];
  const totalItems = tasksResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const globalTasksError = globalTasksErrorObj
    ? globalTasksErrorObj instanceof Error
      ? globalTasksErrorObj.message
      : "Failed to load tasks"
    : "";

  // Task addition handler - invalidates query caches to trigger fresh data fetch
  const handleAddSuccess = useCallback(async () => {
    // Reset to first page to show the new task
    setPage(1);

    // Refresh tasks cache
    queryClient.invalidateQueries({ queryKey: ["global-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["user-activity"] });
  }, [queryClient]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return (
    <div className="flex flex-col w-full space-y-3">
      <MagnetInputCard
        onAddSuccess={handleAddSuccess}
        maxFileSizeGB={maxFileSizeGB}
        taskStatusUpdateIntervalMinutes={taskStatusUpdateIntervalMinutes}
        cleanupStatus={cleanupStatus}
        timeUntilCleanup={timeUntilCleanup}
      />
      <GlobalActivityCard
        tasks={globalTasks}
        loading={globalTasksLoading}
        error={globalTasksError}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        nextTaskStatusUpdate={nextTaskStatusUpdate}
      />
    </div>
  );
}
