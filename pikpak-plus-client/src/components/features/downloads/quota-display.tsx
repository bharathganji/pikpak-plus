"use client";

import { useState, useEffect } from "react";
import { HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuotaResponse } from "@/types/api";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import { calculateTimeRemaining } from "@/lib/time-utils";
import { QuotaStorage } from "./quota-storage";
import { QuotaTransfer } from "./quota-transfer";

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

        {activeProducts && activeProducts.length > 0 && (
          <div className="pt-4 space-y-2 border-t border-dashed">
            <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">
              Extra Premium Packages
            </div>
            {activeProducts.map((product, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-primary/5 p-2 rounded-md border border-primary/10 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {product.product_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Expires:{" "}
                    {new Date(product.expire_time).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quota Refresh Information */}
        {quotaData.refresh_info && (
          <div className="pt-3 border-t border-dashed mt-2">
            <div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Refresh in</span>
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
