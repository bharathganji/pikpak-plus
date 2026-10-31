"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SystemConfig } from "@/types/api";
import {
  getConfig,
  updateConfig,
  triggerCleanup,
  getSchedulerStatus,
} from "@/lib/admin-client";
import {
  Settings as SettingsIcon,
  Loader2,
  RefreshCw,
  Play,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

const defaultConfig: SystemConfig = {
  cleanup_interval_hours: 0,
  task_status_update_interval_minutes: 0,
  webdav_generation_interval_hours: 0,
  max_file_size_gb: 0,
};

export function SystemSettings() {
  const queryClient = useQueryClient();
  const [formDraft, setFormDraft] = useState<Partial<SystemConfig>>({});
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["admin", "config"],
    queryFn: getConfig,
  });

  const schedulerQuery = useQuery({
    queryKey: ["admin", "scheduler-status"],
    queryFn: getSchedulerStatus,
    refetchInterval: 15000,
  });

  const currentConfig = configQuery.data ?? defaultConfig;
  const draft: SystemConfig = {
    ...currentConfig,
    ...formDraft,
  };

  const scheduler = schedulerQuery.data ?? null;
  const loading = configQuery.isLoading && !configQuery.data;
  const refreshing = schedulerQuery.isFetching;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateConfig(draft);
      setFormDraft({});
      queryClient.setQueryData(["admin", "config"], updated);
      setSuccess("Configuration saved successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to save configuration");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerCleanup = async () => {
    setTriggering(true);
    setError(null);
    try {
      await triggerCleanup();
      queryClient.invalidateQueries({
        queryKey: ["admin", "scheduler-status"],
      });
      setSuccess("Cleanup triggered successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to trigger cleanup");
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  const handleRefreshScheduler = async () => {
    setError(null);
    try {
      await schedulerQuery.refetch();
    } catch (err) {
      setError("Failed to refresh scheduler status");
      console.error(err);
    }
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) return "Never";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || configQuery.error || schedulerQuery.error) && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error || "Failed to load system settings"}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scheduler Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cleanup Interval (hours)
              </label>
              <Input
                type="number"
                min={0}
                value={draft.cleanup_interval_hours}
                onChange={(e) =>
                  setFormDraft((prev) => ({
                    ...prev,
                    cleanup_interval_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Task Status Update Interval (minutes)
              </label>
              <Input
                type="number"
                min={0}
                value={draft.task_status_update_interval_minutes}
                onChange={(e) =>
                  setFormDraft((prev) => ({
                    ...prev,
                    task_status_update_interval_minutes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                WebDAV Generation Interval (hours)
              </label>
              <Input
                type="number"
                min={0}
                value={draft.webdav_generation_interval_hours}
                onChange={(e) =>
                  setFormDraft((prev) => ({
                    ...prev,
                    webdav_generation_interval_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <label className="text-sm font-medium">Max File Size (GB)</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={draft.max_file_size_gb}
              onChange={(e) =>
                setFormDraft((prev) => ({
                  ...prev,
                  max_file_size_gb: Number(e.target.value),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="default"
            onClick={handleTriggerCleanup}
            disabled={triggering}
          >
            {triggering ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Cleanup Now
          </Button>
          <Button
            variant="outline"
            onClick={handleRefreshScheduler}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Scheduler Status
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduler Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!scheduler || scheduler.jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scheduler jobs found.
            </p>
          ) : (
            <div className="space-y-4">
              {scheduler.jobs.map((job) => (
                <div key={job.name} className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4" />
                      <span className="font-medium">{job.name}</span>
                    </div>
                    {job.status && (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        {job.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">
                        Last Run:
                      </span>{" "}
                      {formatTimestamp(job.last_run)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Next Run:
                      </span>{" "}
                      {formatTimestamp(job.next_run)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
