"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { LocalTask, LocalShare, STORAGE_KEY, SHARES_STORAGE_KEY } from "./activity/types";
import { EmptyState } from "./activity/empty-state";
import { TaskItem } from "./activity/task-item";
import { ShareItem } from "./activity/share-item";
import {
  DeleteTaskDialog,
  ClearAllDialog,
} from "./activity/confirmation-dialogs";

export function MyActivityTab() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [shares, setShares] = useState<LocalShare[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [clearAllSharesDialogOpen, setClearAllSharesDialogOpen] = useState(false);

  // Load tasks and shares from localStorage
  useEffect(() => {
    loadTasks();
    loadShares();
  }, []);

  const loadTasks = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedTasks: LocalTask[] = JSON.parse(stored);
        setTasks(parsedTasks);
      } catch (e) {
        console.error("Failed to parse local tasks", e);
      }
    }
  };

  const loadShares = () => {
    const stored = localStorage.getItem(SHARES_STORAGE_KEY);
    if (stored) {
      try {
        const parsedShares: LocalShare[] = JSON.parse(stored);
        setShares(parsedShares);
      } catch (e) {
        console.error("Failed to parse local shares", e);
      }
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      const updatedTasks = tasks.filter((t) => t.id !== taskToDelete);
      setTasks(updatedTasks);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    setTasks([]);
    localStorage.removeItem(STORAGE_KEY);
    setClearAllDialogOpen(false);
  };

  const handleDeleteShare = (shareId: string) => {
    const updatedShares = shares.filter((s) => s.id !== shareId);
    setShares(updatedShares);
    localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify(updatedShares));
  };

  const handleClearAllSharesClick = () => {
    setClearAllSharesDialogOpen(true);
  };

  const confirmClearAllShares = () => {
    setShares([]);
    localStorage.removeItem(SHARES_STORAGE_KEY);
    setClearAllSharesDialogOpen(false);
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5">
      <CardContent className="pt-6">
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="tasks">
              My Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="shares">
              Shares Created ({shares.length})
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Download Tasks</h3>
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
              <EmptyState />
            ) : (
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Shares Tab */}
          <TabsContent value="shares" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Share Links</h3>
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-2">No share links yet</p>
                <p className="text-sm text-muted-foreground">
                  Create share links from the task preview dialog
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <div className="space-y-3">
                  {shares.map((share) => (
                    <ShareItem
                      key={share.id}
                      share={share}
                      onDelete={handleDeleteShare}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
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

