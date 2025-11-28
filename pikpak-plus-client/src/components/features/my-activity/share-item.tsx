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
    <div className="flex items-start gap-2.5 p-3 rounded-md border transition-colors hover:bg-accent/50 bg-muted/30 border-border/30 w-full">
      <div className="shrink-0 mt-0.5">
        <Share2 className="h-7 w-7 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="w-full space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate leading-tight">
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
              className="shrink-0 h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Share URL */}
          <div className="w-full">
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex-1 min-w-0 text-xs font-mono bg-muted p-1.5 rounded overflow-hidden">
                <span
                  className="block truncate text-muted-foreground"
                  title={share.share_url}
                >
                  {share.share_url}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(share.share_url)}
                className="shrink-0 h-7 text-xs"
              >
                {copied ? (
                  <span className="text-xs">Copied!</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Password (if applicable) */}
          {share.pass_code && (
            <div className="w-full">
              <div className="flex items-center gap-1.5 w-full">
                <span
                  className="flex-1 min-w-0 text-xs font-mono bg-muted px-2 py-1 rounded truncate"
                  title={share.pass_code}
                >
                  {share.pass_code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(share.pass_code!)}
                  className="shrink-0 h-7 text-xs"
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
