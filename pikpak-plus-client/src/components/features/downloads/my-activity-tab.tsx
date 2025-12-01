"use client";

import { useState } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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

export function MyActivityTab() {
  const [tasks, setTasks] = useLocalStorage<LocalTask[]>(
    [],
    LOCAL_TASKS_STORAGE_KEY,
  );
  const [shares, setShares] = useLocalStorage<LocalShare[]>(
    [],
    LOCAL_SHARES_STORAGE_KEY,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [clearAllSharesDialogOpen, setClearAllSharesDialogOpen] =
    useState(false);

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      const updatedTasks = tasks.filter((t) => t.id !== taskToDelete);
      setTasks(updatedTasks);
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    setTasks([]);
    setClearAllDialogOpen(false);
  };

  const handleDeleteShare = (shareId: string) => {
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
      <CardContent className="pl-2 pr-2 w-full">
        {/* Tasks Section */}
        <div className="border-b border-border/50 pb-6 mb-6 w-full">
          <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 mb-4">
            <h2 className="text-xl font-semibold">My Tasks</h2>
            {tasks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllClick}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="px-3 sm:px-4 md:px-6">
              <EmptyState />
            </div>
          ) : (
            <div className="space-y-2 px-3 sm:px-4 md:px-6 w-full max-w-full">
              {tasks.map((task) => (
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
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {shares.length === 0 ? (
            <div className="px-3 sm:px-4 md:px-6 flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-2">No share links yet</p>
              <p className="text-sm text-muted-foreground">
                Create share links from the task preview dialog
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-3 sm:px-4 md:px-6 w-full max-w-full">
              {shares.map((share) => (
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
        taskCount={tasks.length}
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
