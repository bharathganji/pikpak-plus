"use client";

import { useState, useEffect } from "react";
import { HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotaResponse } from "@/types/api";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import { QuotaStorage } from "./quota-storage";
import { QuotaTransfer } from "./quota-transfer";
import { QuotaExtraPackages } from "./quota-extra-packages";
import { QuotaRefreshInfo } from "./quota-refresh-info";

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

  const activeProducts = quotaData.transfer.data?.filter(
    (p) => p.status === "active",
  );

  return (
    <Card className="border-primary/20 transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          Quota Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <QuotaStorage
          storageUsage={storageUsage}
          storageLimit={storageLimit}
          storagePercent={storagePercent}
        />

        <QuotaTransfer transferData={quotaData.transfer} />

        {activeProducts && (
          <QuotaExtraPackages activeProducts={activeProducts} />
        )}

        <QuotaRefreshInfo refreshInfo={quotaData.refresh_info} />
      </CardContent>
    </Card>
  );
}
