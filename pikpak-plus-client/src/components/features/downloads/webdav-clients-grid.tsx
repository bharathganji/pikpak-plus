"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import { WebDAVClientCard } from "./webdav-client-card";
import { WebDAVClient, WebDAVResponse } from "./webdav-types";
import { WebDAVServerUrl } from "./webdav-server-url";
import { WebDAVUsageInstructions } from "./webdav-usage-instructions";
import { WebDAVRefreshInfo } from "./webdav-refresh-info";
import {
  WebDAVLoadingState,
  WebDAVErrorState,
  WebDAVEmptyState,
  WebDAVTrafficWarning,
} from "./webdav-states";

export function WebDAVClientsGrid() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webdavData, setWebdavData] = useState<WebDAVResponse | null>(null);

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

  if (loading) {
    return (
      <WebDAVLoadingState onRetry={fetchWebDAVClients} loading={loading} />
    );
  }

  if (error) {
    return <WebDAVErrorState error={error} />;
  }

  if (!webdavData?.clients || webdavData.clients.length === 0) {
    return (
      <WebDAVEmptyState
        message={webdavData?.message}
        isTrafficIssue={webdavData?.available === false}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!webdavData.available && (
        <WebDAVTrafficWarning message={webdavData.message} />
      )}

      {webdavData.refresh_info && (
        <WebDAVRefreshInfo refreshInfo={webdavData.refresh_info} />
      )}

      <WebDAVServerUrl />

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

      <WebDAVUsageInstructions />
    </div>
  );
}
