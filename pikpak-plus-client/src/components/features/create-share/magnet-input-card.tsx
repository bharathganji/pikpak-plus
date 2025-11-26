"use client";

import { useState, useEffect } from "react";
import { CloudDownload, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateMagnetLink } from "./magnet-utils";
import { addMagnetLink, fetchConfig, fetchCleanupStatus } from "./api-utils";

interface MagnetInputCardProps {
  onAddSuccess: (taskInfo: any, fileInfo: any) => void;
  maxFileSizeGB: number | null;
  cleanupStatus: {
    next_cleanup: string | null;
    cleanup_interval_hours: number;
    task_retention_hours: number;
    scheduler_running: boolean;
  } | null;
  timeUntilCleanup: string;
}

export function MagnetInputCard({
  onAddSuccess,
  maxFileSizeGB,
  cleanupStatus,
  timeUntilCleanup,
}: MagnetInputCardProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [fileInfo, setFileInfo] = useState<any>(null);

  // Calculate time until cleanup
  useEffect(() => {
    if (!cleanupStatus?.next_cleanup) return;
    const updateCountdown = () => {
      const now = new Date();
      const next = new Date(cleanupStatus.next_cleanup!);
      const diff = next.getTime() - now.getTime();
      if (diff <= 0) {
        // Note: We're not calling fetchCleanupStatus here because that would create a circular dependency
        // The parent component should handle this
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60)) / (1000 * 60));
      // Note: Time until cleanup is managed by parent component
    };
  }, [cleanupStatus]);

  const handleAdd = async () => {
    if (!url.trim()) {
      setValidationError("Please enter a magnet link");
      return;
    }
    const validation = validateMagnetLink(url);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid magnet link");
      return;
    }
    setLoading(true);
    setMessage("");
    setValidationError("");
    setFileInfo(null);
    try {
      const result = await addMagnetLink(url);

      // Extract task information from response
      const taskData = result.task;
      const fileInfoData = result.file_info;

      // Store file info if available
      if (fileInfoData) {
        setFileInfo(fileInfoData);
      }

      setMessage(result.message || "Magnet link added successfully!");
      onAddSuccess({ ...taskData, url: url.trim() }, fileInfoData); // Pass the URL with task data
      setUrl("");
    } catch (error: any) {
      setMessage(error.message);

      // Store file info from error response if available
      if (error.response?.data?.file_info) {
        setFileInfo(error.response.data.file_info);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      handleAdd();
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 w-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base">Add Magnet Link</CardTitle>
        {maxFileSizeGB && (
          <CardDescription className="text-xs">
            Maximum file size: {maxFileSizeGB} GB
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="magnet:?xt=urn:btih:..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 ${validationError ? "border-destructive" : ""}`}
            disabled={loading}
          />
          <Button
            onClick={handleAdd}
            disabled={loading || !url.trim()}
            size="sm"
          >
            {loading ? (
              "Adding..."
            ) : (
              <>
                <CloudDownload className="mr-2 h-4 w-4" /> Add to Cloud
              </>
            )}
          </Button>
        </div>
        {validationError && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        {message && (
          <div className="space-y-2">
            <p
              className={`text-sm ${
                message.includes("Failed") ||
                message.includes("failed") ||
                message.includes("exceeds")
                  ? "text-destructive"
                  : "text-green-500"
              }`}
            >
              {message}
            </p>
            {fileInfo && fileInfo.size && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md space-y-1">
                {fileInfo.name && (
                  <div>
                    <strong>Name:</strong> {fileInfo.name}
                  </div>
                )}
                <div>
                  <strong>Size:</strong>{" "}
                  {(fileInfo.size / 1024 ** 3).toFixed(2)} GB
                </div>
                {fileInfo.file_type?.length &&
                  fileInfo.file_type !== "unknown" && (
                    <div>
                      <strong>Type:</strong> {fileInfo.file_type}
                    </div>
                  )}
                {fileInfo.count && (
                  <div>
                    <strong>Files:</strong> {fileInfo.count}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {cleanupStatus?.scheduler_running && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              Auto-cleanup in{" "}
              <strong className="text-foreground">
                {timeUntilCleanup || "..."}
              </strong>{" "}
              · Content removed after {cleanupStatus.task_retention_hours}h
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
