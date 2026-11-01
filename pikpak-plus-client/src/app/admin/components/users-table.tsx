"use client";

import { useState } from "react";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { AuthUser, UserStats } from "@/types/api";
import {
  getUsers,
  blockUser,
  unblockUser,
  getUserDetails,
} from "@/lib/admin-client";
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
import {
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UsersTable() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const pageSize = 10;

  const [userDetails, setUserDetails] = useState<{
    user: AuthUser;
    stats: UserStats;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { data: usersData, isLoading: loading } = useQuery({
    queryKey: ["admin", "users", { page, pageSize, search: appliedSearch }],
    queryFn: () =>
      getUsers(page, pageSize, undefined, appliedSearch || undefined),
    placeholderData: keepPreviousData,
  });

  const users = usersData?.data ?? [];
  const totalCount = usersData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleBlock = async (email: string) => {
    if (!confirm(`Are you sure you want to block ${email}?`)) return;
    try {
      await blockUser(email);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    } catch (error) {
      console.error("Failed to block user", error);
      alert("Failed to block user");
    }
  };

  const handleUnblock = async (email: string) => {
    try {
      await unblockUser(email);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard-stats"] });
    } catch (error) {
      console.error("Failed to unblock user", error);
    }
  };

  const loadUserDetails = async (email: string) => {
    setDetailsLoading(true);
    try {
      const data = await getUserDetails(email);
      setUserDetails(data);
    } catch (error) {
      console.error("Failed to load details", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[260px] sm:w-[320px] bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
            />
          </div>
          <Button type="submit" variant="secondary" className="shadow-xs">
            Search
          </Button>
        </form>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Total Users: <span className="font-semibold text-foreground">{totalCount}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden shadow-xs bg-card/60 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Email</TableHead>
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Role</TableHead>
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status</TableHead>
              <TableHead className="p-3 sm:p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Joined</TableHead>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.email} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="p-3 sm:p-4 font-medium text-sm">{user.email}</TableCell>
                  <TableCell className="p-3 sm:p-4">
                    {user.is_admin ? (
                      <Badge variant="default" className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-xs">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border/70 text-muted-foreground">
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="p-3 sm:p-4">
                    {user.blocked ? (
                      <Badge variant="destructive" className="bg-destructive/15 text-destructive border border-destructive/30 shadow-xs">
                        Blocked
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
                    {user.created_at
                      ? format(new Date(user.created_at), "MMM d, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="p-3 sm:p-4 text-right">
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/60">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-lg border-border/80">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                          <DialogTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => {
                                loadUserDetails(user.email);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" /> View Details
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DropdownMenuSeparator />
                          {user.blocked ? (
                            <DropdownMenuItem
                              onClick={() => handleUnblock(user.email)}
                              className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600"
                            >
                              <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />{" "}
                              Unblock User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleBlock(user.email)}
                              disabled={user.is_admin}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />{" "}
                              Block User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold">User Details</DialogTitle>
                        </DialogHeader>
                        {detailsLoading ? (
                          <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : userDetails ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                  Email
                                </label>
                                <p className="font-semibold text-foreground truncate" title={userDetails.user.email}>
                                  {userDetails.user.email}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                  Role
                                </label>
                                <p className="font-medium text-foreground">
                                  {userDetails.user.is_admin ? "Admin" : "User"}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                  Status
                                </label>
                                <p className="font-medium text-foreground">
                                  {userDetails.user.blocked
                                    ? "Blocked"
                                    : "Active"}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                  Joined
                                </label>
                                <p className="text-muted-foreground">
                                  {userDetails.user.created_at
                                    ? format(
                                        new Date(userDetails.user.created_at),
                                        "PPpp",
                                      )
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-border/60 pt-4">
                              <h4 className="text-sm font-semibold mb-2">Statistics</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-muted/40 p-4 border border-border/40 rounded-xl shadow-xs">
                                  <div className="text-2xl font-bold tracking-tight">
                                    {userDetails.stats.total_tasks}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Total Tasks
                                  </div>
                                </Card>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">
                            No details available
                          </p>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page === 1 || loading}
          className="shadow-xs border-border/80"
        >
          Previous
        </Button>
        <div className="text-xs sm:text-sm font-medium px-2">
          Page {page} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || loading}
          className="shadow-xs border-border/80"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
