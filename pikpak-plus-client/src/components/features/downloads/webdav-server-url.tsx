"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Server, Copy, Check } from "lucide-react";
import copy from "copy-to-clipboard";

const SERVER_URL = "https://dav.mypikpak.com";

export function WebDAVServerUrl() {
  const [copied, setCopied] = useState(false);

  const copyServerUrl = () => {
    copy(SERVER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-linear-to-br from-primary/5 via-primary/[0.02] to-background shadow-xs backdrop-blur-xs">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold mb-1 text-foreground">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Server className="h-4 w-4" />
          </div>
          <span>Server URL (Same for all clients)</span>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 bg-background/90 dark:bg-muted/30 px-3.5 py-2 rounded-lg text-sm font-mono border border-border/60 truncate shadow-2xs select-all text-foreground">
            {SERVER_URL}
          </code>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 transition-smooth hover:border-primary/40 hover:bg-primary/5 active:scale-95"
            onClick={copyServerUrl}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-500 dark:text-emerald-400 animate-scale-in" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
