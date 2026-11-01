"use client";
import { useState } from "react";
import { Trash2, FileIcon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalTask } from "./types";
import { formatTimeAgo, formatFileSize } from "./utils";
import copy from "copy-to-clipboard";

interface TaskItemProps {
  task: LocalTask;
  onDelete: (taskId: string) => void;
}

export function TaskItem({ task, onDelete }: Readonly<TaskItemProps>) {
  const isCompleted = task.status === "completed" || task.status === "success";
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-accent/40 shadow-xs transition-colors w-full bg-card">
      <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
        <FileIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="w-full space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4
                className="font-medium text-sm truncate leading-tight tracking-tight"
                title={task.name || "Processing..."}
              >
                {task.name || "Processing..."}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {task.file_size && (
                  <>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatFileSize(task.file_size)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                  </>
                )}
                <Badge
                  variant={isCompleted ? "default" : "secondary"}
                  className="text-[10px] h-4 px-1.5 whitespace-nowrap font-medium"
                >
                  {task.status}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {formatTimeAgo(task.timestamp)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                onClick={() => onDelete(task.id)}
                title="Delete Task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Magnet Link */}
          <div className="w-full">
            <div className="flex items-center gap-1.5 w-full rounded-lg border border-border/50 bg-muted/40 p-1">
              <div className="flex-1 min-w-0 text-xs font-mono px-2 py-0.5 overflow-hidden">
                <span
                  className="block truncate text-foreground/85"
                  title={task.url}
                >
                  {task.url}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(task.url)}
                className="shrink-0 h-7 text-xs shadow-2xs"
              >
                {copied ? (
                  <span className="text-xs font-medium">Copied!</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
