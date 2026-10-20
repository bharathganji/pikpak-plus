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
  );
}
