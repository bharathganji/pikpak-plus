"use client";

import { useState } from "react";
import { CloudDownload, AlertCircle, CheckCircle2, Clock, Info } from "lucide-react";
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
  const [detectedLinkType, setDetectedLinkType] = useState<
    string | undefined
  >();

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
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30";
      case "e2dk":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground border-border/60";
    }
  };

  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-xs w-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">Add Download Link</CardTitle>
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
      <CardContent className="space-y-3 px-4 pt-0.5 pb-4">
        {/* Info Banner */}
        <div className="flex items-start gap-2.5 text-xs bg-blue-50/70 text-blue-950 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-900/60 p-3 rounded-lg border">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Enter a{" "}
            <strong className="font-semibold text-blue-950 dark:text-white">
              magnet link
            </strong>{" "}
            (magnet:?xt=urn:btih:...) or an{" "}
            <strong className="font-semibold text-blue-950 dark:text-white">
              E2DK link
            </strong>{" "}
            (ed2k://|file|...|/){" "}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="magnet:?xt=urn:btih:... or ed2k://|file|..."
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 rounded-lg transition-all ${
              validationError
                ? "border-destructive focus-visible:ring-destructive/30"
                : "border-input focus-visible:ring-primary/20"
            }`}
            disabled={loading}
          />
          <Button
            onClick={handleAdd}
            disabled={loading || !url.trim()}
            size="sm"
            className="rounded-lg shadow-xs transition-all hover:shadow-sm"
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
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        {message && (
          <div
            className={`space-y-3 rounded-lg border p-4 transition-all ${
              message.includes("Failed") ||
              message.includes("failed") ||
              message.includes("exceeds")
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <div className="flex items-start gap-2">
              {message.includes("Failed") ||
              message.includes("failed") ||
              message.includes("exceeds") ? (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <p className="text-sm font-medium leading-tight">{message}</p>
            </div>
            {fileInfo?.size && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {fileInfo.name && (
                  <Badge
                    variant="outline"
                    className="font-normal max-w-full truncate rounded-md border-border/60 bg-background/80"
                  >
                    <span className="font-semibold mr-1 text-foreground">Name:</span> {fileInfo.name}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="font-normal rounded-md"
                >
                  <span className="font-semibold mr-1 text-foreground">Size:</span>{" "}
                  {(fileInfo.size / 1024 ** 3).toFixed(2)} GB
                </Badge>
                {fileInfo.file_type?.length &&
                  fileInfo.file_type !== "unknown" && (
                    <Badge
                      variant="outline"
                      className="font-normal rounded-md border-border/60 bg-background/80"
                    >
                      <span className="font-semibold mr-1 text-foreground">Type:</span> {fileInfo.file_type}
                    </Badge>
                  )}
                {fileInfo.count && (
                  <Badge
                    variant="secondary"
                    className="font-normal rounded-md"
                  >
                    <span className="font-semibold mr-1 text-foreground">Files:</span> {fileInfo.count}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
        {cleanupStatus?.scheduler_running && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/40 text-xs">
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
