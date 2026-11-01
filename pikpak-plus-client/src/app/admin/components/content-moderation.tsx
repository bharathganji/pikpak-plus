"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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

import { getLogs, deleteTask } from "@/lib/admin-client";
import { Loader2, Trash2, ExternalLink } from "lucide-react";

export function ContentModeration() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [emailInput, setEmailInput] = useState("");
  const [appliedEmail, setAppliedEmail] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const pageSize = 10;

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["admin", "logs", { page, pageSize, actionFilter, appliedEmail }],
    queryFn: () => {
      const action = actionFilter === "all" ? undefined : actionFilter;
      return getLogs(page, pageSize, action, appliedEmail || undefined);
    },
    placeholderData: keepPreviousData,
  });

  const logs = logsData?.data ?? [];
  const totalCount = logsData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const loading = isLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedEmail(emailInput.trim());
  };

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
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
      queryClient.invalidateQueries({ queryKey: ["admin", "logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
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
            className="w-full sm:w-[260px] bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
          />
          <Button type="submit" variant="secondary" className="shadow-xs">
            Filter
          </Button>
        </form>
        <div className="relative w-full sm:w-[180px]">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-xs"
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="add">Add Task</option>
            <option value="share">Share File</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden shadow-xs bg-card/60 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">User</TableHead>
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Action</TableHead>
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Content</TableHead>
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Timestamp</TableHead>
              <TableHead className="p-3 sm:p-4 text-right font-semibold text-xs text-muted-foreground uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="p-3 sm:p-4 font-medium text-xs text-muted-foreground">
                    {log.user_email || "Anonymous"}
                  </TableCell>
                  <TableCell className="p-3 sm:p-4">
                    {log.action === "add" ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-xs"
                      >
                        Add
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs"
                      >
                        Share
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="p-3 sm:p-4 max-w-[300px]">
                    <div className="truncate text-sm font-medium text-foreground" title={log.data?.url}>
                      {log.data?.whatslink?.name ||
                        log.data?.task?.name ||
                        log.data?.url ||
                        "Unknown Content"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate opacity-70 font-mono">
                      {log.data?.url}
                    </div>
                  </TableCell>
                  <TableCell className="p-3 sm:p-4 text-xs whitespace-nowrap text-muted-foreground">
                    {log.created_at
                      ? format(new Date(log.created_at), "MMM d, pp")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="p-3 sm:p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {log.data?.url && (
                        <a
                          href={log.data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(log.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors"
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

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{totalCount}</span> records
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page === 1 || loading}
            className="shadow-xs border-border/80"
          >
            Previous
          </Button>
          <div className="text-xs sm:text-sm font-medium self-center px-2">
            Page {page} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= totalPages || loading}
            className="shadow-xs border-border/80"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
