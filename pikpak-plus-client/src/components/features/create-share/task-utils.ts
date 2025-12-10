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
  return phase === "PHASE_TYPE_COMPLETE" || progress === 100;
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

  if (isTaskCompleted(task)) {
    // Use PikPak message if available for completed tasks
    if (message && message !== "Saved") {
      return { label: message, variant: "success" };
    }
    return { label: "Saved", variant: "success" };
  } else if (phase === "PHASE_TYPE_RUNNING") {
    // For high progress values, show more specific messages
    if (progress === 99) {
      return { label: "Almost done", variant: "processing" };
    } else if (progress !== undefined && progress >= 95) {
      return { label: "Finalizing", variant: "processing" };
    } else if (progress !== undefined && progress >= 80) {
      return { label: "Nearly complete", variant: "processing" };
    }
    // Use PikPak message if available during processing
    if (message) {
      return { label: message, variant: "processing" };
    }
    return { label: `${progress || 0}%`, variant: "processing" };
  } else if (phase === "PHASE_TYPE_ERROR") {
    // Use PikPak message for error details
    if (message) {
      return { label: message, variant: "destructive" };
    }
    return { label: "Failed", variant: "destructive" };
  } else {
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
