import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, Check, Copy, Lock, Calendar } from "lucide-react";
import { ShareData } from "@/types/api";

interface CreateShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string | undefined;
  generatedShare: ShareData | null;
  shareCopied: boolean;
  onCopyShare: (url: string) => void;
  shareNeedPassword: boolean;
  setShareNeedPassword: (need: boolean) => void;
  shareExpirationDays: number;
  setShareExpirationDays: (days: number) => void;
  creatingShare: boolean;
  onCreateShare: () => void;
}

export function CreateShareDialog({
  open,
  onOpenChange,
  fileName,
  generatedShare,
  shareCopied,
  onCopyShare,
  shareNeedPassword,
  setShareNeedPassword,
  shareExpirationDays,
  setShareExpirationDays,
  creatingShare,
  onCreateShare,
}: CreateShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Create Share Link
          </DialogTitle>
          <DialogDescription className="truncate">{fileName}</DialogDescription>
        </DialogHeader>

        {generatedShare ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted rounded-md space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">
                  Share URL:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={generatedShare.share_url}
                    className="font-mono text-xs h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCopyShare(generatedShare.share_url)}
                    className="h-8 px-2.5 shrink-0"
                  >
                    {shareCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {generatedShare.pass_code && (
                <div className="pt-2">
                  <span className="text-muted-foreground block mb-1">
                    Access Passcode:
                  </span>
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs tracking-wider"
                  >
                    {generatedShare.pass_code}
                  </Badge>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-sm">
            <div className="flex items-center justify-between border p-3 rounded-md">
              <div className="space-y-0.5">
                <div className="font-medium text-xs flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Require Passcode
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Generate an access code for protected sharing
                </div>
              </div>
              <input
                type="checkbox"
                checked={shareNeedPassword}
                onChange={(e) => setShareNeedPassword(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Expiration Period
              </label>
              <select
                value={shareExpirationDays}
                onChange={(e) => setShareExpirationDays(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={-1}>Permanent (Never Expires)</option>
                <option value={1}>1 Day</option>
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={onCreateShare} disabled={creatingShare}>
                {creatingShare ? "Creating..." : "Generate Share Link"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
