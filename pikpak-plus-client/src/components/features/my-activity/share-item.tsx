"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LocalShare } from "./types";
import copy from "copy-to-clipboard";

interface ShareItemProps {
  share: LocalShare;
  onDelete: (shareId: string) => void;
}

export function ShareItem({ share, onDelete }: Readonly<ShareItemProps>) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-accent/40 shadow-xs transition-colors w-full bg-card">
      <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Share2 className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="w-full space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate leading-tight tracking-tight">
                {share.file_name}
              </h4>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Created{" "}
                {formatDistanceToNow(new Date(share.timestamp), {
                  addSuffix: true,
                })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(share.id)}
              className="shrink-0 h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
              title="Delete Share"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Share URL */}
          <div className="w-full">
            <div className="flex items-center gap-1.5 w-full rounded-lg border border-border/50 bg-muted/40 p-1">
              <div className="flex-1 min-w-0 text-xs font-mono px-2 py-0.5 overflow-hidden">
                <span
                  className="block truncate text-foreground/85"
                  title={share.share_url}
                >
                  {share.share_url}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(share.share_url)}
                className="shrink-0 h-7 text-xs shadow-2xs"
              >
                {copied ? (
                  <span className="text-xs font-medium">Copied!</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Password (if applicable) */}
          {share.pass_code && (
            <div className="w-full">
              <div className="flex items-center gap-1.5 w-full rounded-lg border border-border/50 bg-muted/40 p-1">
                <span
                  className="flex-1 min-w-0 text-xs font-mono font-medium px-2 py-0.5 truncate text-foreground"
                  title={share.pass_code}
                >
                  {share.pass_code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(share.pass_code!)}
                  className="shrink-0 h-7 text-xs shadow-2xs"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
