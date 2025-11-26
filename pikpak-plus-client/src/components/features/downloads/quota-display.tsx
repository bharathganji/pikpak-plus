"use client";

import { useState, useEffect } from "react";
import { HardDrive, Download, Upload, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuotaResponse } from "@/types/api";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";

const formatBytes = (bytes: number | string): string => {
  const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
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
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMsg = "Cannot connect to server. Please ensure the backend is running.";
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
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQuota}
            className="mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
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

  const storageUsage = parseInt(quotaData.storage.quota.usage, 10);
  const storageLimit = parseInt(quotaData.storage.quota.limit, 10);
  const storagePercent = (storageUsage / storageLimit) * 100;

  // Cloud Download Traffic (offline)
  const offlineUsed = quotaData.transfer.base?.offline?.size || 0;
  const offlineTotal = quotaData.transfer.base?.offline?.total_assets || 0;
  const offlinePercent = offlineTotal > 0 ? (offlineUsed / offlineTotal) * 100 : 0;

  // Downstream Traffic (download)
  const downloadUsed = quotaData.transfer.base?.download?.size || 0;
  const downloadTotal = quotaData.transfer.base?.download?.total_assets || 0;
  const downloadPercent = downloadTotal > 0 ? (downloadUsed / downloadTotal) * 100 : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Quota Information
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchQuota}
            disabled={loading}
            className="h-7 w-7"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Quota */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Storage
            </span>
            <span className="font-medium">
              {formatBytes(storageUsage)} / {formatBytes(storageLimit)}
            </span>
          </div>
          <Progress value={storagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {storagePercent.toFixed(1)}% used
          </p>
        </div>

        {/* Transfer Quotas */}
        <div className="space-y-3 pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground">
            Monthly Transfer Quota
          </div>

          {/* Cloud Download Traffic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Download className="h-3 w-3" />
                Cloud Download Traffic
              </span>
            </div>
            <Progress value={offlinePercent} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Used {formatBytes(offlineUsed)} / Total {formatBytes(offlineTotal)}
              </span>
              <span className="font-medium">
                {offlinePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Downstream Traffic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Downstream Traffic
              </span>
            </div>
            <Progress value={downloadPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Used {formatBytes(downloadUsed)} / Total {formatBytes(downloadTotal)}
              </span>
              <span className="font-medium">
                {downloadPercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Includes online streaming, viewing, and downloading transfer
            </p>
          </div>
        </div>

        {quotaData.transfer.base?.vip_status && (
          <div className="pt-2 border-t">
            <Badge variant="secondary" className="text-xs">
              {quotaData.transfer.base.vip_status}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

