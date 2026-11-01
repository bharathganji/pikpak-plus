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
    <div className="space-y-4 pt-4 border-t border-dashed border-border/60">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
          Monthly Transfer
        </div>
        {transferData.base?.vip_status && (
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-2 font-medium tracking-wide border-primary/20 bg-primary/10 text-primary"
          >
            {transferData.base.vip_status}
          </Badge>
        )}
      </div>

      {/* Cloud Download Traffic */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Download className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground">Cloud Download</span>
          </span>
          <span className="font-semibold font-mono text-xs text-foreground">
            {offlinePercent.toFixed(1)}%
          </span>
        </div>
        <Progress
          value={offlinePercent}
          className={`h-2 bg-muted/60 ${getProgressColor(offlinePercent)}`}
        />
        <div className="flex justify-end text-[11px] font-mono text-muted-foreground">
          {formatBytes(offlineUsed)} / {formatBytes(offlineTotal)}
        </div>
      </div>

      {/* Downstream Traffic */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <div className="p-1 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Upload className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground">Downstream</span>
          </span>
          <span className="font-semibold font-mono text-xs text-foreground">
            {downloadPercent.toFixed(1)}%
          </span>
        </div>
        <Progress
          value={downloadPercent}
          className={`h-2 bg-muted/60 ${getProgressColor(downloadPercent)}`}
        />
        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
          <span className="italic opacity-80 text-[10px]">Streaming & Downloading</span>
          <span className="font-mono">
            {formatBytes(downloadUsed)} / {formatBytes(downloadTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
