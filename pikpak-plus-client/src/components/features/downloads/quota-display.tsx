"use client";

import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotaResponse } from "@/types/api";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import { QuotaStorage } from "./quota-storage";
import { QuotaTransfer } from "./quota-transfer";
import { QuotaExtraPackages } from "./quota-extra-packages";
import { QuotaRefreshInfo } from "./quota-refresh-info";

const fetchQuota = async (): Promise<QuotaResponse> => {
  const apiUrl = getApiUrl();
  const response = await axios.get<QuotaResponse>(`${apiUrl}/quota`);
  return response.data;
};

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
      return "Cannot connect to server. Please ensure the backend is running.";
    } else if (err.response?.data?.error) {
      return String(err.response.data.error);
    } else if (err.message) {
      return err.message;
    }
  } else if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
}

export function QuotaDisplay() {
  const {
    data: quotaData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["quota"],
    queryFn: fetchQuota,
  });

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
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !quotaData) {
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
