"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || configQuery.error || schedulerQuery.error) && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive shadow-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error || "Failed to load system settings"}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300 shadow-xs font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold">Scheduler Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">
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
                className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all shadow-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">
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
                className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all shadow-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">
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
                className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all shadow-xs"
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary hover:opacity-95 shadow-md shadow-primary/20 transition-all font-medium">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold">Storage Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <label className="text-xs sm:text-sm font-medium text-foreground">Max File Size (GB)</label>
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
              className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all shadow-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold">Manual Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="default"
            onClick={handleTriggerCleanup}
            disabled={triggering}
            className="gradient-primary hover:opacity-95 shadow-md shadow-primary/20 transition-all font-medium"
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
            className="border-border/80 hover:bg-muted/60 transition-colors shadow-xs"
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

      <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            Scheduler Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!scheduler || scheduler.jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scheduler jobs found.
            </p>
          ) : (
            <div className="space-y-3">
              {scheduler.jobs.map((job) => (
                <div key={job.name} className="rounded-xl border border-border/60 p-4 bg-muted/20 hover:bg-muted/30 transition-colors shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm sm:text-base text-foreground">{job.name}</span>
                    </div>
                    {job.status && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                        {job.status}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:text-sm text-muted-foreground md:grid-cols-2">
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
