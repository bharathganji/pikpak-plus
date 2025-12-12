import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseTaskRecord } from "@/types";
import { formatFileSize } from "./task-utils";

interface FileDetailsProps {
  task: SupabaseTaskRecord;
  copyToClipboard: (text: string, taskId?: number) => void;
  copiedId: number | null;
}

/** Format file type for display */
function formatFileType(fileType?: string): string {
  if (!fileType) return "";
  return fileType.charAt(0).toUpperCase() + fileType.slice(1);
}

export function FileDetails({
  task,
  copyToClipboard,
  copiedId,
}: Readonly<FileDetailsProps>) {
  const taskData = task.data.task?.task;
  const whatslink = task.data.whatslink;

  // Normalize screenshots - handle both string[] and {screenshot: string, time: number}[] formats
  const rawScreenshots = whatslink?.screenshots || [];
  const screenshots: string[] = rawScreenshots
    .map((item: string | { screenshot: string }) =>
      typeof item === "string" ? item : item.screenshot
    )
    .filter(Boolean);
  const hasScreenshots = screenshots.length > 0;

  return (
    <div className="space-y-4">
      {/* File Name */}
      <div>
        <h4 className="text-sm font-semibold mb-1">File Name</h4>
        <p className="text-sm text-muted-foreground break-all">
          {taskData?.file_name || "N/A"}
        </p>
      </div>

      {/* File Type & Count from WhatsLink */}
      {whatslink && (whatslink.file_type || whatslink.count) && (
        <div className="flex items-center gap-2 flex-wrap">
          {whatslink.file_type && (
            <Badge variant="outline" className="text-xs">
              {formatFileType(whatslink.file_type)}
            </Badge>
          )}
          {whatslink.count && whatslink.count > 1 && (
            <Badge variant="secondary" className="text-xs">
              {whatslink.count} files
            </Badge>
          )}
        </div>
      )}

      {/* Size */}
      {taskData?.file_size && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Size</h4>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(taskData.file_size)}
          </p>
        </div>
      )}

      {/* Screenshots Gallery */}
      {hasScreenshots && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4" />
            Preview Screenshots
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {screenshots.slice(0, 6).map((url, index) => (
              <Button
                key={url}
                variant="ghost"
                className="relative aspect-video rounded-md overflow-hidden border hover:border-primary p-0 h-auto"
                onClick={() => window.open(url, "_blank")}
              >
                <Image
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 150px"
                  className="object-cover hover:scale-105 transition-transform"
                />
              </Button>
            ))}
          </div>
          {screenshots.length > 6 && (
            <p className="text-xs text-muted-foreground mt-1">
              +{screenshots.length - 6} more screenshots
            </p>
          )}
        </div>
      )}

      {/* Magnet URL */}
      <div>
        <h4 className="text-sm font-semibold mb-1">Magnet URL</h4>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground break-all flex-1 font-mono">
            {task.data.url}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              copyToClipboard(task.data.url, task.id);
            }}
            className="shrink-0 h-8"
          >
            {copiedId === task.id ? (
              <span className="text-xs">Copied!</span>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Added */}
      <div>
        <h4 className="text-sm font-semibold mb-1">Added</h4>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(task.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}
