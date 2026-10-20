import { Download, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatBytes, getProgressColor } from "./quota-utils";
import { TransferQuota } from "@/types/api";

interface QuotaTransferProps {
  transferData: TransferQuota;
}

export function QuotaTransfer({ transferData }: QuotaTransferProps) {
  // API Structure (Dec 2024):
  // - base: Common monthly quota everyone gets (40TB cloud, 4TB downstream, 1TB upload)
  // - transfer: EXTRA quota from purchased premium plans (e.g. dt_100_year product)
  // - Total available = base + transfer

  // Cloud Download Traffic (offline)
  const baseOffline = transferData.base?.offline;
  const extraOffline = transferData.transfer?.offline;

  // Base quota: usage from size/assets, total from total_assets
  const baseOfflineUsed = baseOffline?.size ?? baseOffline?.assets ?? 0;
  const baseOfflineTotal = baseOffline?.total_assets ?? 0;

  // Extra quota from purchased plans
  const extraOfflineUsed = extraOffline?.assets ?? 0;
  const extraOfflineTotal = extraOffline?.total_assets ?? 0;

  // Combined totals
  const offlineUsed = baseOfflineUsed + extraOfflineUsed;
  const offlineTotal = baseOfflineTotal + extraOfflineTotal;
  const offlinePercent =
    offlineTotal > 0 ? (offlineUsed / offlineTotal) * 100 : 0;

  // Downstream Traffic (download)
  const baseDownload = transferData.base?.download;
  const extraDownload = transferData.transfer?.download;

  const baseDownloadUsed = baseDownload?.size ?? baseDownload?.assets ?? 0;
  const baseDownloadTotal = baseDownload?.total_assets ?? 0;

  const extraDownloadUsed = extraDownload?.assets ?? 0;
  const extraDownloadTotal = extraDownload?.total_assets ?? 0;

  const downloadUsed = baseDownloadUsed + extraDownloadUsed;
  const downloadTotal = baseDownloadTotal + extraDownloadTotal;
  const downloadPercent =
    downloadTotal > 0 ? (downloadUsed / downloadTotal) * 100 : 0;

  return (
    <div className="space-y-4 pt-4 border-t border-dashed">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Monthly Transfer
        </div>
        {transferData.base?.vip_status && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {transferData.base.vip_status}
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
  );
}
