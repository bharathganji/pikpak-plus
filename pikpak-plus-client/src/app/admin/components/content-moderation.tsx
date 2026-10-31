"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { SupabaseTaskRecord } from "@/types/api";
import { getLogs, deleteTask } from "@/lib/admin-client";
import { Loader2, Trash2, ExternalLink } from "lucide-react";

export function ContentModeration() {
  const [logs, setLogs] = useState<SupabaseTaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [emailInput, setEmailInput] = useState("");
  const [appliedEmail, setAppliedEmail] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    let ignore = false;

    const loadLogs = async () => {
      try {
        const action = actionFilter === "all" ? undefined : actionFilter;
        const res = await getLogs(
          page,
          pageSize,
          action,
          appliedEmail || undefined
        );
        if (!ignore) {
          setLogs(res.data);
          setTotalCount(res.count);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch logs", error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      ignore = true;
    };
  }, [page, appliedEmail, actionFilter, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    setAppliedEmail(emailInput.trim());
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleActionChange = (value: string) => {
    setLoading(true);
    setActionFilter(value);
    setPage(1);
  };

  const handlePrevPage = () => {
    setLoading(true);
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setLoading(true);
    setPage((p) => Math.min(totalPages, p + 1));
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this log? This action cannot be undone.",
      )
    )
      return;
    try {
      await deleteTask(id);
      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to delete log", error);
      alert("Failed to delete log");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Filter by User Email..."
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="w-full sm:w-[250px]"
          />
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
        <div className="relative w-[180px]">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="add">Add Task</option>
            <option value="share">Share File</option>
          </select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-xs text-muted-foreground">
                    {log.user_email || "Anonymous"}
                  </TableCell>
                  <TableCell>
                    {log.action === "add" ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200"
                      >
                        Add
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200"
                      >
                        Share
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate text-sm" title={log.data?.url}>
                      {log.data?.whatslink?.name ||
                        log.data?.task?.name ||
                        log.data?.url ||
                        "Unknown Content"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate opacity-70">
                      {log.data?.url}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {log.created_at
                      ? format(new Date(log.created_at), "MMM d, pp")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {log.data?.url && (
                        <a
                          href={log.data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(log.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Total: {totalCount} records
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <div className="text-sm font-medium self-center">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
