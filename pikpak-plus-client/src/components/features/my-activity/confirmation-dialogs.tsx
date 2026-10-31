"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

interface BaseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "destructive" | "default";
  icon?: "warning" | "trash";
}

function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = "default",
  icon = "warning",
}: Readonly<BaseConfirmationDialogProps>) {
  const IconComponent = icon === "trash" ? Trash2 : AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                variant === "destructive"
                  ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                  : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
              }`}
            >
              <IconComponent
                className={`h-6 w-6 ${
                  variant === "destructive"
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}
              />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left text-lg font-semibold">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteTaskDialog({
  open,
  onOpenChange,
  onConfirm,
}: Readonly<DeleteDialogProps>) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Task"
      description="This action will permanently remove this task from your activity log. Once deleted, you won't be able to recover the task details or status."
      confirmLabel="Delete Task"
      variant="destructive"
      icon="trash"
    />
  );
}

interface ClearAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  taskCount: number;
}

export function ClearAllDialog({
  open,
  onOpenChange,
  onConfirm,
  taskCount,
}: Readonly<ClearAllDialogProps>) {
  const taskText = taskCount === 1 ? "task" : "tasks";
  const description = `This will permanently remove all ${taskCount} ${taskText} from your activity log. This action cannot be undone and you'll lose all task history and details.`;

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Clear All Tasks"
      description={description}
      confirmLabel={`Clear All (${taskCount})`}
      variant="destructive"
    />
  );
}
