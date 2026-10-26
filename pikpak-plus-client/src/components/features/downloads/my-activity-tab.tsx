"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LocalTask,
  LocalShare,
  LOCAL_TASKS_STORAGE_KEY,
  LOCAL_SHARES_STORAGE_KEY,
} from "../my-activity/types";
import { EmptyState } from "../my-activity/empty-state";
import { TaskItem } from "../my-activity/task-item";
import { ShareItem } from "../my-activity/share-item";
import {
  DeleteTaskDialog,
  ClearAllDialog,
} from "../my-activity/confirmation-dialogs";
import { taskService } from "@/services/task-service";
import { shareService } from "@/services/share-service";
import { SupabaseTaskRecord } from "@/types/api";

export function MyActivityTab() {
  const [tasks, setTasks] = useLocalStorage<LocalTask[]>(
    [],
    LOCAL_TASKS_STORAGE_KEY,
  );
  const [shares, setShares] = useLocalStorage<LocalShare[]>(
    [],
    LOCAL_SHARES_STORAGE_KEY,
  );
  const [serverTasks, setServerTasks] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [clearAllSharesDialogOpen, setClearAllSharesDialogOpen] =
    useState(false);

  // Sync tasks from backend GET /tasks
  const syncServerTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taskService.getTasks(1, 100);
      const records: SupabaseTaskRecord[] = response.data || [];

      const mapped: LocalTask[] = (records || []).map((record) => {
        const taskData = record.data.task?.task;
        const whatslink = record.data.whatslink;
        const phase = taskData?.phase;

        let status = "running";
        if (phase === "PHASE_TYPE_COMPLETE") status = "completed";
        else if (phase === "PHASE_TYPE_ERROR") status = "failed";
        else if (taskData?.progress === 100) status = "completed";

        return {
          id: String(record.id),
          url: record.data.url,
          status,
          timestamp: new Date(record.created_at).getTime(),
          name:
            taskData?.file_name ||
            whatslink?.name ||
            record.data.meta?.title ||
            "Download Task",
          file_size:
            taskData?.file_size ||
            (whatslink?.size ? String(whatslink.size) : undefined),
          file_type: whatslink?.file_type,
          file_id: taskData?.file_id,
        };
      });

      setServerTasks(mapped);

      // Also try syncing remote shares
      try {
        const remoteShares = await shareService.getShares();
        if (remoteShares.length > 0) {
          const mappedShares: LocalShare[] = (remoteShares || []).map((s) => ({
            id: s.share_id || s.id || `share-${Date.now()}`,
            file_name: s.file_name || "Shared Content",
            share_url: s.share_url,
            pass_code: s.pass_code,
            timestamp: s.created_at
              ? new Date(s.created_at).getTime()
              : Date.now(),
            file_id: s.id || "",
          }));

          // Merge with local shares
          const shareMap = new Map<string, LocalShare>();
          mappedShares.forEach((ms) => shareMap.set(ms.share_url, ms));
          shares.forEach((ls) => {
            if (!shareMap.has(ls.share_url)) {
              shareMap.set(ls.share_url, ls);
            }
          });
          setShares(Array.from(shareMap.values()));
        }
      } catch (err) {
        console.error(err);
        // Non-blocking for shares
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync tasks from server");
    } finally {
      setLoading(false);
    }
  }, [setShares, shares]);

  useEffect(() => {
    syncServerTasks();
  }, [syncServerTasks]);

  // Combine server tasks and local tasks without duplicates
  const taskMap = new Map<string, LocalTask>();
  serverTasks.forEach((st) => taskMap.set(st.url || st.id, st));
  tasks.forEach((lt) => {
    const key = lt.url || lt.id;
    if (!taskMap.has(key)) {
      taskMap.set(key, lt);
    }
  });
  const allTasks = Array.from(taskMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      if (/^\d+$/.test(taskToDelete)) {
        try {
          await taskService.deleteTask(taskToDelete);
        } catch (err) {
          console.error(err);
          // If server delete fails, still clear locally
        }
      }
      setServerTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
      setTasks(tasks.filter((t) => t.id !== taskToDelete));
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    setTasks([]);
    setServerTasks([]);
    setClearAllDialogOpen(false);
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      await shareService.revokeShare(shareId);
    } catch (err) {
      console.error(err);
      // Continue local cleanup
    }
    const updatedShares = shares.filter((s) => s.id !== shareId);
    setShares(updatedShares);
  };

  const handleClearAllSharesClick = () => {
    setClearAllSharesDialogOpen(true);
  };

  const confirmClearAllShares = () => {
    setShares([]);
    setClearAllSharesDialogOpen(false);
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 w-full max-w-full">
      <CardContent className="pl-2 pr-2 w-full pt-4">
        {error && (
          <Alert
            variant="destructive"
            className="mb-4 mx-3 sm:mx-4 md:mx-6 text-xs"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={syncServerTasks}
                className="h-6 text-[11px] ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tasks Section */}
        <div className="border-b border-border/50 pb-6 mb-6 w-full">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">My Tasks</h2>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                (Server Synced)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={syncServerTasks}
                disabled={loading}
                title="Sync from server"
                className="h-8 w-8"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>

              {allTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllClick}
                  className="text-destructive hover:text-destructive h-8 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {loading && allTasks.length === 0 ? (
            <div className="space-y-2 px-3 sm:px-4 md:px-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </div>
          ) : allTasks.length === 0 ? (
            <div className="px-3 sm:px-4 md:px-6">
              <EmptyState />
            </div>
          ) : (
            <div className="space-y-2 px-3 sm:px-4 md:px-6 w-full max-w-full">
              {(allTasks || []).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Shares Section */}
        <div className="w-full">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 mb-4">
            <h2 className="text-xl font-semibold">Shares Created</h2>
            {shares.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllSharesClick}
                className="text-destructive hover:text-destructive h-8 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {shares.length === 0 ? (
            <div className="px-3 sm:px-4 md:px-6 flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-2 text-sm">
                No share links yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create share links from the File Explorer or task details dialog
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-3 sm:px-4 md:px-6 w-full max-w-full">
              {(shares || []).map((share) => (
                <ShareItem
                  key={share.id}
                  share={share}
                  onDelete={handleDeleteShare}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialogs */}
      <DeleteTaskDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />

      <ClearAllDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        onConfirm={confirmClearAll}
        taskCount={allTasks.length}
      />

      <ClearAllDialog
        open={clearAllSharesDialogOpen}
        onOpenChange={setClearAllSharesDialogOpen}
        onConfirm={confirmClearAllShares}
        taskCount={shares.length}
      />
    </Card>
  );
}

export default MyActivityTab;
