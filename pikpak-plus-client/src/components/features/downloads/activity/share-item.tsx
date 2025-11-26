"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, AlertTriangle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LocalShare } from "./types";

interface ShareItemProps {
  share: LocalShare;
  onDelete: (shareId: string) => void;
}

export function ShareItem({ share, onDelete }: ShareItemProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="space-y-3">
        {/* File Name and Delete Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{share.file_name}</h4>
            <p className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(new Date(share.timestamp), { addSuffix: true })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(share.id)}
            className="shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Expiration Warning */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-500/50">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-950 dark:text-amber-50">
            This link may be expired if the cleanup job has run
          </p>
        </div>

        {/* Share URL */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            Share Link
          </label>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground break-all flex-1 font-mono bg-muted p-2 rounded">
              {share.share_url}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(share.share_url)}
              className="shrink-0 h-8"
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
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Password
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono bg-muted px-3 py-1.5 rounded flex-1">
                {share.pass_code}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(share.pass_code!)}
                className="shrink-0 h-8"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

