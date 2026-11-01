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
      <DialogContent className="sm:max-w-md rounded-2xl border-border/60 bg-card shadow-lg">
        <DialogHeader className="space-y-3">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                variant === "destructive"
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}
            >
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left text-lg font-semibold tracking-tight">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-lg"
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            className="w-full sm:w-auto rounded-lg shadow-2xs"
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
