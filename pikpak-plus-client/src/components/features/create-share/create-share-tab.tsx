"use client";

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import { MagnetInputCard } from "./magnet-input-card";
import { GlobalActivityCard } from "./global-activity-card";
import { fetchConfig, fetchCleanupStatus, fetchGlobalTasks } from "./api-utils";
import { useLocalStorage } from "@uidotdev/usehooks";
import { LocalTask, LOCAL_TASKS_STORAGE_KEY } from "../my-activity/types";

export function CreateShareTab() {
  // Global tasks state
  const [globalTasks, setGlobalTasks] = useState<any[]>([]);
  const [globalTasksLoading, setGlobalTasksLoading] = useState(true);
  const [globalTasksError, setGlobalTasksError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Local activity state (for permanent retention)
  const [, setLocalTasks] = useLocalStorage<LocalTask[]>(
    LOCAL_TASKS_STORAGE_KEY,
    [],
  );

  // Cleanup status state
  const [cleanupStatus, setCleanupStatus] = useState<{
    next_cleanup: string | null;
    cleanup_interval_hours: number;
    task_retention_hours: number;
    scheduler_running: boolean;
  } | null>(null);

  // Config state
  const [maxFileSizeGB, setMaxFileSizeGB] = useState<number | null>(null);
  const [taskStatusUpdateIntervalMinutes, setTaskStatusUpdateIntervalMinutes] =
    useState<number | null>(null);
  const [nextTaskStatusUpdate, setNextTaskStatusUpdate] = useState<
    string | null
  >(null);

  // Mount check to prevent hydration mismatches using useSyncExternalStore
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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

  // Fetch config and cleanup status on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch config and cleanup status in parallel
        const [configData, cleanupData] = await Promise.all([
          fetchConfig(),
          fetchCleanupStatus(),
        ]);

        setMaxFileSizeGB(configData.max_file_size_gb);
        setTaskStatusUpdateIntervalMinutes(
          configData.task_status_update_interval_minutes,
        );
        setNextTaskStatusUpdate(configData.next_task_status_update);

        setCleanupStatus(cleanupData);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        // Set default values on error
        setMaxFileSizeGB(25);
        setTaskStatusUpdateIntervalMinutes(15);
        setCleanupStatus(null);
      }
    };

    fetchData();
  }, []);

  // Fetch tasks with cancellation token to avoid race conditions
  useEffect(() => {
    if (!isMounted) return;

    let ignore = false;

    const loadTasks = async () => {
      try {
        const result = await fetchGlobalTasks(page, pageSize);
        if (!ignore) {
          setGlobalTasks(result.data);
          setTotalPages(Math.ceil(result.count / pageSize));
          setTotalItems(result.count);
          setGlobalTasksError("");
        }
      } catch (error: unknown) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Failed to load tasks";
          setGlobalTasksError(message);
        }
      } finally {
        if (!ignore) {
          setGlobalTasksLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      ignore = true;
    };
  }, [isMounted, page, pageSize]);

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

      // Refresh the task list from server to show the newly added task
      try {
        const result = await fetchGlobalTasks(1, pageSize);
        setGlobalTasks(result.data);
        setTotalPages(Math.ceil(result.count / pageSize));
        setTotalItems(result.count);
      } catch (error) {
        console.error("Failed to refresh tasks after adding:", error);
      }
    },
    [setLocalTasks, pageSize],
  );

  const handlePageChange = useCallback((newPage: number) => {
    setGlobalTasksLoading(true);
    setPage(newPage);
  }, []);

  // Optimized page size change handler
  const handlePageSizeChange = useCallback((newSize: number) => {
    setGlobalTasksLoading(true);
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
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
