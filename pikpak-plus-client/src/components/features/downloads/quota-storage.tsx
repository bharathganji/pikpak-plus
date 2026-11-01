import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatBytes, getProgressColor } from "./quota-utils";

interface QuotaStorageProps {
  storageUsage: number;
  storageLimit: number;
  storagePercent: number;
}

export function QuotaStorage({
  storageUsage,
  storageLimit,
  storagePercent,
}: QuotaStorageProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <HardDrive className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-foreground">Storage</span>
        </span>
        <span className="font-medium font-mono text-xs text-muted-foreground bg-muted/60 dark:bg-muted/40 px-2.5 py-0.5 rounded-md border border-border/50 shadow-2xs">
          {formatBytes(storageUsage)} / {formatBytes(storageLimit)}
        </span>
      </div>
      <Progress
        value={storagePercent}
        className={`h-2.5 bg-muted/60 ${getProgressColor(storagePercent)}`}
      />
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">
          {storagePercent >= 90 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              Critical usage
            </span>
          ) : (
            "Space used"
          )}
        </span>
        <span
          className={`font-semibold font-mono ${storagePercent >= 90 ? "text-destructive" : "text-muted-foreground"}`}
        >
          {storagePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
