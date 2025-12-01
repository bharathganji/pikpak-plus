"use client";

import { useState, useEffect } from "react";
import { HardDrive, Download, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { QuotaResponse } from "@/types/api";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import { calculateTimeRemaining } from "@/lib/time-utils";

const formatBytes = (bytes: number | string): string => {
  const numBytes =
    typeof bytes === "string" ? Number.parseInt(bytes, 10) : bytes;
  if (numBytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return `${(numBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export function QuotaDisplay() {
  const [quotaData, setQuotaData] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = getApiUrl();
      const response = await axios.get<QuotaResponse>(`${apiUrl}/quota`);
      setQuotaData(response.data);
    } catch (err: any) {
      let errorMsg = "Unknown error";

      // Check if it's a network error (backend not running)
      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        errorMsg =
          "Cannot connect to server. Please ensure the backend is running.";
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Quota Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !quotaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Quota Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const storageUsage = Number.parseInt(quotaData.storage.quota.usage, 10);
  const storageLimit = Number.parseInt(quotaData.storage.quota.limit, 10);
  const storagePercent = (storageUsage / storageLimit) * 100;

  // Cloud Download Traffic (offline)
  const offlineUsed = quotaData.transfer.base?.offline?.size || 0;
  const offlineTotal = quotaData.transfer.base?.offline?.total_assets || 0;
  const offlinePercent =
    offlineTotal > 0 ? (offlineUsed / offlineTotal) * 100 : 0;

  // Downstream Traffic (download)
  const downloadUsed = quotaData.transfer.base?.download?.size || 0;
  const downloadTotal = quotaData.transfer.base?.download?.total_assets || 0;
  const downloadPercent =
    downloadTotal > 0 ? (downloadUsed / downloadTotal) * 100 : 0;

  const getProgressColor = (percent: number) => {
    if (percent >= 90)
      return "[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600";
    if (percent >= 70)
      return "[&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-yellow-600";
    return ""; // Default primary gradient
  };

  return (
    <Card className="border-primary/20 transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          Quota Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Storage Quota */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/10">
                <HardDrive className="h-3 w-3 text-primary" />
              </div>
              Storage
            </span>
            <span className="font-medium font-mono text-xs">
              {formatBytes(storageUsage)} / {formatBytes(storageLimit)}
            </span>
          </div>
          <Progress
            value={storagePercent}
            className={`h-2.5 ${getProgressColor(storagePercent)}`}
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {storagePercent >= 90 ? "Critical usage" : "Space used"}
            </span>
            <span
              className={`font-medium ${storagePercent >= 90 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {storagePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Transfer Quotas */}
        <div className="space-y-4 pt-4 border-t border-dashed">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Monthly Transfer
            </div>
            {quotaData.transfer.base?.vip_status && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {quotaData.transfer.base.vip_status}
              </Badge>
            )}
          </div>

          {/* Cloud Download Traffic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="p-1 rounded-md bg-green-500/10">
                  <Download className="h-3 w-3 text-green-600" />
                </div>
                Cloud Download
              </span>
              <span className="font-medium font-mono text-xs">
                {offlinePercent.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={offlinePercent}
              className={`h-2 ${getProgressColor(offlinePercent)}`}
            />
            <div className="flex justify-end text-[10px] text-muted-foreground">
              {formatBytes(offlineUsed)} / {formatBytes(offlineTotal)}
            </div>
          </div>

          {/* Downstream Traffic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="p-1 rounded-md bg-orange-500/10">
                  <Upload className="h-3 w-3 text-orange-600" />
                </div>
                Downstream
              </span>
              <span className="font-medium font-mono text-xs">
                {downloadPercent.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={downloadPercent}
              className={`h-2 ${getProgressColor(downloadPercent)}`}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span className="italic opacity-80">Streaming & Downloading</span>
              <span>
                {formatBytes(downloadUsed)} / {formatBytes(downloadTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Quota Refresh Information */}
        {quotaData.refresh_info && (
          <div className="pt-3 border-t border-dashed mt-2">
            <div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Resets in</span>
              <Badge
                variant="outline"
                className="font-mono text-xs bg-background"
              >
                {calculateTimeRemaining(
                  quotaData.refresh_info.quota_next_refresh,
                )}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
