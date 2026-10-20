import { RefreshInfo } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { calculateTimeRemaining } from "@/lib/time-utils";

interface QuotaRefreshInfoProps {
  refreshInfo?: RefreshInfo;
}

export function QuotaRefreshInfo({ refreshInfo }: QuotaRefreshInfoProps) {
  if (!refreshInfo) {
    return null;
  }

  return (
    <div className="pt-3 border-t border-dashed mt-2">
      <div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Refresh in</span>
        <Badge variant="outline" className="font-mono text-xs bg-background">
          {calculateTimeRemaining(refreshInfo.quota_next_refresh)}
        </Badge>
      </div>
    </div>
  );
}
