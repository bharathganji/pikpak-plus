import type { SupabaseTaskRecord } from "@/types";

/**
 * Formats bytes to human-readable file size
 */
export function formatFileSize(bytes: string | undefined): string {
  if (!bytes) return "Unknown";
  const size = Number.parseInt(bytes);
  if (Number.isNaN(size)) return "Unknown";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }

  return `${fileSize.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Checks if a task is completed
 */
export function isTaskCompleted(task: SupabaseTaskRecord): boolean {
  const taskData = task.data.task?.task;
  const phase = taskData?.phase;
  const progress = taskData?.progress;

  // Only consider it completed if the phase is actually complete and progress is 100
  // Don't use progress === 100 alone as it can be true for error states
  return phase === "PHASE_TYPE_COMPLETE" && progress === 100;
}

/**
 * Determines the status label and variant for a completed task
 */
function getCompletedTaskStatus(message?: string): {
  label: string;
  variant: "success";
} {
  // Use PikPak message if available for completed tasks
  if (message && message !== "Saved") {
    return { label: message, variant: "success" };
  }
  return { label: "Saved", variant: "success" };
}

/**
 * Determines the status label and variant for a running task
 */
function getRunningTaskStatus(
  message: string | undefined,
  progress?: number
): {
  label: string;
  variant: "processing";
} {
  // Use PikPak message if available during processing
  if (message) {
    return { label: message, variant: "processing" };
  }
  return { label: `${progress || 0}%`, variant: "processing" };
}

/**
 * Determines the status label and variant for an error task
 */
function getErrorTaskStatus(message?: string): {
  label: string;
  variant: "destructive";
} {
  // Use PikPak message for error details
  if (message) {
    return { label: message, variant: "destructive" };
  }
  return { label: "Failed", variant: "destructive" };
}

/**
 * Determines the status label and variant for a pending or processing task
 */
function getPendingOrProcessingTaskStatus(
  phase: string | undefined,
  message: string | undefined,
  progress?: number
): {
  label: string;
  variant: "secondary" | "processing";
} {
  // For pending tasks, check if it's actually pending or just no progress yet
  if (phase === "PHASE_TYPE_PENDING" || !progress) {
    // Use PikPak message for pending tasks if available
    if (message) {
      return { label: message, variant: "secondary" };
    }
    return { label: "Pending", variant: "secondary" };
  }

  // If we have progress but not in running state, use processing variant
  if (message) {
    return { label: message, variant: "processing" };
  }
  return { label: "Processing", variant: "processing" };
}

/**
 * Determines task status based on phase, progress, and PikPak message
 */
export function getTaskStatus(task: SupabaseTaskRecord): {
  label: string;
  variant:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "success"
    | "warning"
    | "info"
    | "processing";
} {
  const taskData = task.data.task?.task;
  const phase = taskData?.phase;
  const progress = taskData?.progress;
  const message = taskData?.message;

  // Handle completed tasks first
  if (isTaskCompleted(task)) {
    return getCompletedTaskStatus(message);
  }

  // Handle running tasks
  if (phase === "PHASE_TYPE_RUNNING") {
    return getRunningTaskStatus(message, progress);
  }

  // Handle error tasks
  if (phase === "PHASE_TYPE_ERROR") {
    return getErrorTaskStatus(message);
  }

  // Handle pending or other processing states
  return getPendingOrProcessingTaskStatus(phase, message, progress);
}

/**
 * Checks if a task represents a folder
 */
export function isFolder(task: SupabaseTaskRecord): boolean {
  const taskData = task.data.task?.task;
  const type = taskData?.type;
  const kind = taskData?.kind;
  const name = taskData?.name || taskData?.file_name || "";

  if (kind === "drive#folder" || type === "folder") {
    return true;
  }

  const hasExtension = /\.[a-zA-Z0-9]+$/.test(name);
  return !hasExtension;
}

/**
 * Extracts task name from various possible fields
 */
export function getTaskName(task: SupabaseTaskRecord): string {
  const taskData = task.data.task?.task;
  return (
    taskData?.name || taskData?.file_name || task.data.meta?.title || "Unknown"
  );
}
