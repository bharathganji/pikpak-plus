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
    <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] duration-300">
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">{client.planetEmoji}</span>
          <span>{client.planetName}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {/* Username */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Username</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted/50 px-3 py-2 rounded text-xs font-mono truncate">
              {client.username}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => copyToClipboard(client.username, "username")}
            >
              {copiedField === "username" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Key className="h-3 w-3" />
            <span>Password</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted/50 px-3 py-2 rounded text-xs font-mono truncate">
              {client.password}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => copyToClipboard(client.password, "password")}
            >
              {copiedField === "password" ? (
                <Check className="h-4 w-4 text-green-500" />
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
