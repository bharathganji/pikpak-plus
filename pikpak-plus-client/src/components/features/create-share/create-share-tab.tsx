"use client";

import { useState, useEffect } from "react";
import { MagnetInputCard } from "./magnet-input-card";
import { GlobalActivityCard } from "./global-activity-card";
import { LocalTask, STORAGE_KEY } from "./magnet-utils";
import { fetchConfig, fetchCleanupStatus, fetchGlobalTasks, addMagnetLink } from "./api-utils";

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

  // Local task URLs for highlighting
  const [localTaskUrls, setLocalTaskUrls] = useState<string[]>([]);

  // Load local task URLs for highlighting
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const tasks: LocalTask[] = JSON.parse(stored);
        setLocalTaskUrls(tasks.map((t) => t.url));
      } catch (e) {
        console.error("Failed to parse local tasks", e);
      }
    }
  }, []);

  // Fetch config and cleanup status on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch config
      const configData = await fetchConfig();
      setMaxFileSizeGB(configData.max_file_size_gb);

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
    const stored = localStorage.getItem(STORAGE_KEY);
    const existing = stored ? JSON.parse(stored) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newTask, ...existing]));

    // Refresh the local task URLs to highlight the new task
    setLocalTaskUrls([newTask.url, ...existing.map((t: any) => t.url)]);

    // Refresh global tasks and reset to first page
    fetchGlobalTasks(1, pageSize).then(result => {
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
      />
    </div>
  );
}
