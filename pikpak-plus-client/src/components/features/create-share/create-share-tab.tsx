"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "primereact/hooks";
import { MagnetInputCard } from "./magnet-input-card";
import { GlobalActivityCard } from "./global-activity-card";
import { LocalTask, LOCAL_TASKS_STORAGE_KEY } from "../my-activity/types";
import { fetchConfig, fetchCleanupStatus, fetchGlobalTasks } from "./api-utils";

export function CreateShareTab() {
  // Global tasks state
  const [globalTasks, setGlobalTasks] = useState<any[]>([]);
  const [globalTasksLoading, setGlobalTasksLoading] = useState(true);
  const [globalTasksError, setGlobalTasksError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Cleanup status state
  const [cleanupStatus, setCleanupStatus] = useState<{
    next_cleanup: string | null;
    cleanup_interval_hours: number;
    task_retention_hours: number;
    scheduler_running: boolean;
  } | null>(null);
  const [timeUntilCleanup, setTimeUntilCleanup] = useState("");

  // Config state
  const [maxFileSizeGB, setMaxFileSizeGB] = useState<number | null>(null);
  const [taskStatusUpdateIntervalMinutes, setTaskStatusUpdateIntervalMinutes] =
    useState<number | null>(null);
  const [nextTaskStatusUpdate, setNextTaskStatusUpdate] = useState<
    string | null
  >(null);

  // Local tasks storage
  const [localTasks, setLocalTasks] = useLocalStorage<LocalTask[]>(
    [],
    LOCAL_TASKS_STORAGE_KEY,
  );

  // Local task URLs for highlighting
  const [localTaskUrls, setLocalTaskUrls] = useState<string[]>([]);

  // Update local task URLs when localTasks changes
  useEffect(() => {
    setLocalTaskUrls(localTasks.map((t) => t.url));
  }, [localTasks]);

  // Fetch config and cleanup status on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch config
      const configData = await fetchConfig();
      setMaxFileSizeGB(configData.max_file_size_gb);
      setTaskStatusUpdateIntervalMinutes(
        configData.task_status_update_interval_minutes,
      );
      setNextTaskStatusUpdate(configData.next_task_status_update);

      // Fetch cleanup status
      const cleanupData = await fetchCleanupStatus();
      setCleanupStatus(cleanupData);
    };

    fetchData();
  }, []);

  // Calculate time until cleanup and refresh it periodically
  useEffect(() => {
    if (!cleanupStatus?.next_cleanup) return;

    const updateCountdown = () => {
      const now = new Date();
      const next = new Date(cleanupStatus.next_cleanup!);
      const diff = next.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeUntilCleanup("Soon");
        // Refresh cleanup status when time is up
        fetchCleanupStatus().then(setCleanupStatus);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilCleanup(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [cleanupStatus]);

  // Fetch global tasks
  useEffect(() => {
    const fetchTasks = async () => {
      setGlobalTasksLoading(true);
      setGlobalTasksError("");
      try {
        const result = await fetchGlobalTasks(page, pageSize);
        setGlobalTasks(result.data);
        const count = result.count;
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error: any) {
        setGlobalTasksError(error.message);
      } finally {
        setGlobalTasksLoading(false);
      }
    };

    fetchTasks();
  }, [page, pageSize]);

  const handleAddSuccess = (taskData: any, fileInfoData: any) => {
    // Create new task object
    const taskName = taskData?.name || fileInfoData?.name || "Processing...";
    const fileSize = taskData?.file_size || fileInfoData?.size?.toString();
    const fileType = fileInfoData?.file_type;

    const newTask: LocalTask = {
      id: taskData?.id || Date.now().toString(),
      url: taskData?.url || "", // We need to preserve the URL from the input
      status: "Added",
      timestamp: Date.now(),
      name: taskName,
      file_size: fileSize,
      file_type: fileType,
    };

    // Update local storage with new task
    let existing = [...localTasks];

    // Check if task with same ID already exists
    const existingIndex = existing.findIndex((t) => t.id === newTask.id);

    if (existingIndex !== -1) {
      // Remove existing task so we can add it to the top
      existing.splice(existingIndex, 1);
    }

    // Add new task to the top
    const updatedTasks = [newTask, ...existing];
    setLocalTasks(updatedTasks);

    // Refresh global tasks and reset to first page
    fetchGlobalTasks(1, pageSize).then((result) => {
      setGlobalTasks(result.data);
      setTotalPages(Math.ceil(result.count / pageSize));
    });
    setPage(1);
  };

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
        localTaskUrls={localTaskUrls}
        loading={globalTasksLoading}
        error={globalTasksError}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize: number) => {
          setPageSize(newSize);
          setPage(1); // Reset to first page when changing page size
        }}
        nextTaskStatusUpdate={nextTaskStatusUpdate}
      />
    </div>
  );
}
