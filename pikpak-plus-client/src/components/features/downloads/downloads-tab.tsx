import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuotaDisplay } from "./quota-display";
import { WebDAVClientsGrid } from "./webdav-clients-grid";
import { UsefulLinks } from "./useful-links";

export function DownloadsTab() {
  return (
    <div className="space-y-4">
      {/* Quota Information - Compact at the top */}
      <QuotaDisplay />

      {/* WebDAV Clients - Dynamic Display */}
      <Card>
        <CardHeader>
          <CardTitle>Connect via WebDAV</CardTitle>
          <CardDescription>
            Access all public files using any WebDAV client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebDAVClientsGrid />
        </CardContent>
      </Card>

      {/* Useful Links */}
      <UsefulLinks />
    </div>
  );
}
