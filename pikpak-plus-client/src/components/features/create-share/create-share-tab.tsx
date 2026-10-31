"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { MagnetInputCard } from "./magnet-input-card";
import { GlobalActivityCard } from "./global-activity-card";
import { fetchConfig, fetchCleanupStatus, fetchGlobalTasks } from "./api-utils";
import { useLocalStorage } from "@uidotdev/usehooks";
import { LocalTask, LOCAL_TASKS_STORAGE_KEY } from "../my-activity/types";

export function CreateShareTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Local activity state (for permanent retention)
  const [, setLocalTasks] = useLocalStorage<LocalTask[]>(
    LOCAL_TASKS_STORAGE_KEY,
    [],
  );

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

  // Optimized task addition with batch operations
  const handleAddSuccess = useCallback(
    async (taskData: any, fileInfoData: any) => {
      // Create new task object with defaults
      const newTask: LocalTask = {
        id: taskData?.id || Date.now().toString(),
        url: taskData?.url || "",
        status: "Added",
        timestamp: Date.now(),
        name: taskData?.name || fileInfoData?.name || "Processing...",
        file_size: taskData?.file_size || fileInfoData?.size?.toString(),
        file_type: fileInfoData?.file_type,
      };

      // Optimized array operations using Set for O(1) lookup
      setLocalTasks((prevTasks) => {
        const existingTasks = new Set(prevTasks.map((t) => t.id));

        // Filter out existing task if it exists and add new task
        const filteredTasks = existingTasks.has(newTask.id)
          ? prevTasks.filter((t) => t.id !== newTask.id)
          : prevTasks;

        // Add new task to the top with single array operation
        return [newTask, ...filteredTasks];
      });

      // Reset to first page to show the new task
      setPage(1);

      // Refresh tasks cache
      queryClient.invalidateQueries({ queryKey: ["global-tasks"] });
    },
    [setLocalTasks, queryClient],
  );

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
