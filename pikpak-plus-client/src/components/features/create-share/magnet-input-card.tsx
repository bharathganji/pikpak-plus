"use client";

import { useState } from "react";
import { CloudDownload, AlertCircle, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateDownloadLink } from "./magnet-utils";
import { addMagnetLink } from "./api-utils";

interface MagnetInputCardProps {
  onAddSuccess: (taskInfo: any, fileInfo: any) => void;
  maxFileSizeGB: number | null;
  taskStatusUpdateIntervalMinutes: number | null;
  cleanupStatus: {
    next_cleanup: string | null;
    cleanup_interval_hours: number;
    scheduler_running: boolean;
  } | null;
  timeUntilCleanup: string;
}

export function MagnetInputCard({
  onAddSuccess,
  maxFileSizeGB,
  taskStatusUpdateIntervalMinutes,
  cleanupStatus,
  timeUntilCleanup,
}: Readonly<MagnetInputCardProps>) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [detectedLinkType, setDetectedLinkType] = useState<string | undefined>();

  const handleAdd = async () => {
    if (!url.trim()) {
      setValidationError("Please enter a download link");
      return;
    }
    const validation = validateDownloadLink(url);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid download link");
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

      setMessage(result.message || "Link added successfully!");
      onAddSuccess({ ...taskData, url: url.trim() }, fileInfoData); // Pass the URL with task data
      setUrl("");
      setDetectedLinkType(undefined);
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

  // Detect link type as user types
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      const validation = validateDownloadLink(value);
      setDetectedLinkType(validation.linkType);
    } else {
      setDetectedLinkType(undefined);
    }
  };

  const getLinkTypeColor = (type?: string) => {
    switch (type) {
      case "magnet":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
      case "e2dk":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 w-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Add Download Link</CardTitle>
            <CardDescription className="text-xs">
              Supports magnet links and E2DK links
            </CardDescription>
          </div>
          {detectedLinkType && (
            <Badge className={getLinkTypeColor(detectedLinkType)}>
              {detectedLinkType.toUpperCase()}
            </Badge>
          )}
        </div>
        {maxFileSizeGB && (
          <CardDescription className="text-xs mt-2">
            Maximum file size: {maxFileSizeGB} GB
          </CardDescription>
        )}
        {taskStatusUpdateIntervalMinutes && (
          <CardDescription className="text-xs">
            Task status updates every {taskStatusUpdateIntervalMinutes} minutes
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 px-4 pt-0.5 pb-4">
        {/* Info Banner */}
        <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-900 dark:text-blue-300">
            Enter a <strong>magnet link</strong> (magnet:?xt=urn:btih:...) or an <strong>E2DK link</strong> (ed2k://|file|...|/){" "}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="magnet:?xt=urn:btih:... or ed2k://|file|..."
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
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
            {fileInfo?.size && (
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-xs">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              Auto-cleanup in{" "}
              <strong className="text-foreground">
                {timeUntilCleanup || "..."}
              </strong>{" "}
              · Content removed every {cleanupStatus.cleanup_interval_hours}h
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
