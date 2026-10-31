"use client";

import { useQuery } from "@tanstack/react-query";
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

const fetchClients = async (): Promise<WebDAVResponse> => {
  const apiUrl = getApiUrl();
  const response = await axios.get(`${apiUrl}/webdav/active-clients`);
  return response.data;
};

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
      return "Cannot connect to server. Please ensure the backend is running.";
    } else if (err.response?.data?.error) {
      return String(err.response.data.error);
    } else if (err.message) {
      return err.message;
    }
  } else if (err instanceof Error) {
    return err.message;
  }
  return "Failed to load WebDAV clients";
}

export function WebDAVClientsGrid() {
  const {
    data: webdavData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["webdav-active-clients"],
    queryFn: fetchClients,
  });

  const handleRetry = () => {
    refetch();
  };

  if (isLoading) {
    return <WebDAVLoadingState onRetry={handleRetry} loading={isFetching} />;
  }

  if (error) {
    return <WebDAVErrorState error={getErrorMessage(error)} />;
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
