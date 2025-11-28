import { Clock } from "lucide-react";
import { calculateTimeRemaining } from "@/lib/time-utils";
import { RefreshInfo } from "./webdav-types";

interface WebDAVRefreshInfoProps {
  readonly refreshInfo: RefreshInfo;
}

export function WebDAVRefreshInfo({ refreshInfo }: WebDAVRefreshInfoProps) {
  return (
    <div className="mt-4 p-4 rounded-lg border bg-muted/30">
      <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
        <Clock className="h-4 w-4" />
        WebDAV Refresh Information
      </h4>
      <div className="text-sm text-muted-foreground">
        <p className="mb-1">
          Refreshes in:{" "}
          <span className="font-mono">
            {calculateTimeRemaining(refreshInfo.webdav_next_refresh || "")}
          </span>
        </p>
        <p className="mt-1">
          Credentials regenerate every{" "}
          <strong className="text-foreground">
            {refreshInfo.webdav_generation_interval_hours}h
          </strong>
        </p>
      </div>
    </div>
  );
}
