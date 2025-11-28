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
    <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Server className="h-4 w-4 text-primary" />
          <span>Server URL (Same for all clients)</span>
        </div>
        <div className="flex gap-2">
          <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono border truncate">
            {SERVER_URL}
          </code>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={copyServerUrl}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
