import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, ExternalLink, Copy, Trash2 } from "lucide-react";
import { RemoteShareItem } from "@/services/share-service";

interface ManageSharesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingShares: boolean;
  remoteShares: RemoteShareItem[];
  revokingShareId: string | null;
  onRevokeShare: (shareId: string) => void;
  onCopyShare: (url: string) => void;
}

export function ManageSharesDialog({
  open,
  onOpenChange,
  loadingShares,
  remoteShares,
  revokingShareId,
  onRevokeShare,
  onCopyShare,
}: ManageSharesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Active Remote Shares
          </DialogTitle>
          <DialogDescription>
            View and revoke active share links generated on your PikPak storage
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 space-y-3 py-2">
          {loadingShares ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : remoteShares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No active remote shares found.
            </div>
          ) : (
            remoteShares.map((share) => {
              const shareId = share.share_id || share.id || "";
              const isRevoking = revokingShareId === shareId;

              return (
                <div
                  key={shareId || share.share_url}
                  className="p-3 border rounded-md bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-medium truncate text-foreground">
                      {share.file_name || "Shared Content"}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={share.share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline flex items-center gap-1 text-[11px] truncate max-w-xs"
                      >
                        {share.share_url}
                        <ExternalLink className="h-3 w-3 inline shrink-0" />
                      </a>
                      {share.pass_code && (
                        <Badge variant="secondary" className="text-[10px]">
                          Code: {share.pass_code}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCopyShare(share.share_url)}
                      className="h-7 px-2 text-[11px] gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRevokeShare(shareId)}
                      disabled={isRevoking || !shareId}
                      className="h-7 px-2 text-[11px] gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      {isRevoking ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
