"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Key, User } from "lucide-react";
import { WebDAVClient } from "./webdav-types";
import copy from "copy-to-clipboard";

interface WebDAVClientCardProps {
  readonly client: WebDAVClient;
}

export function WebDAVClientCard({ client }: WebDAVClientCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    copy(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card className="relative overflow-hidden transition-smooth border-border/60 hover:border-primary/40 hover-lift hover:shadow-lg">
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <span className="text-2xl drop-shadow-xs select-none">{client.planetEmoji}</span>
          <span className="tracking-tight text-foreground">{client.planetName}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-3.5">
        {/* Username */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>Username</span>
          </div>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 bg-muted/60 dark:bg-muted/40 font-mono text-xs border border-border/50 rounded-lg px-3 py-2 truncate shadow-2xs select-all text-foreground">
              {client.username}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0 transition-smooth hover:bg-muted active:scale-95 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(client.username, "username")}
            >
              {copiedField === "username" ? (
                <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 animate-scale-in" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Key className="h-3.5 w-3.5" />
            <span>Password</span>
          </div>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 bg-muted/60 dark:bg-muted/40 font-mono text-xs border border-border/50 rounded-lg px-3 py-2 truncate shadow-2xs select-all text-foreground">
              {client.password}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0 transition-smooth hover:bg-muted active:scale-95 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(client.password, "password")}
            >
              {copiedField === "password" ? (
                <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 animate-scale-in" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
