"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import { WebDAVClientCard } from "./webdav-client-card";
import { WebDAVClient, WebDAVResponse } from "./webdav-types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  WifiOff,
  Server,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function WebDAVClientsGrid() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webdavData, setWebdavData] = useState<WebDAVResponse | null>(null);
  const [copiedServerUrl, setCopiedServerUrl] = useState(false);

  const SERVER_URL = "https://dav.mypikpak.com";

  const copyServerUrl = async () => {
    try {
      await navigator.clipboard.writeText(SERVER_URL);
      setCopiedServerUrl(true);
      setTimeout(() => setCopiedServerUrl(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    fetchWebDAVClients();
  }, []);

  const fetchWebDAVClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/webdav/active-clients`);

      const data: WebDAVResponse = response.data;
      setWebdavData(data);
    } catch (err: any) {
      console.error("Failed to fetch WebDAV clients:", err);
      let errorMsg = "Failed to load WebDAV clients";

      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        errorMsg =
          "Cannot connect to server. Please ensure the backend is running.";
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading WebDAV clients...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load WebDAV clients: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // No data or traffic exhausted
  if (!webdavData?.available) {
    return (
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="text-orange-900 dark:text-orange-200">
          {webdavData?.message || "No WebDAV clients available at this time."}
        </AlertDescription>
      </Alert>
    );
  }

  // No clients available yet
  if (!webdavData.clients || webdavData.clients.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {webdavData.message ||
            "No WebDAV clients currently active. They will be created on the next scheduled run."}
        </AlertDescription>
      </Alert>
    );
  }

  // Display clients in responsive grid
  return (
    <div className="space-y-4">
      {/* Global Server URL Section */}
      <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Server className="h-4 w-4 text-primary" />
              <span>Server URL (Same for all clients)</span>
            </div>
            <code className="block bg-background px-3 py-2 rounded text-sm font-mono border">
              {SERVER_URL}
            </code>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={copyServerUrl}
          >
            {copiedServerUrl ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Active WebDAV Clients</h3>
        <span className="text-sm text-muted-foreground">
          {webdavData.clients.length} client
          {webdavData.clients.length === 1 ? "" : "s"} available
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {webdavData.clients.map((client: WebDAVClient) => (
          <WebDAVClientCard key={client.username} client={client} />
        ))}
      </div>

      <div className="mt-4 p-4 rounded-lg border bg-muted/30">
        <h4 className="font-medium mb-2 text-sm">How to connect?</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Open your WebDAV client (Raidrive, VLC, Infuse, etc.)</li>
          <li>Enter the Server URL shown above</li>
          <li>Choose any client and use its username and password</li>
          <li>Browse and download freely!</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          💡 All clients provide access to the same files. Choose any planet you
          like!
        </p>
      </div>
    </div>
  );
}
