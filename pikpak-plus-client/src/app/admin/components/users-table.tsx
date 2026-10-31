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
      <div className="flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="text-sm text-muted-foreground">
          Total Users: {totalCount}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.is_admin ? (
                      <Badge variant="default" className="bg-purple-600">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-emerald-950 bg-emerald-50 dark:text-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.created_at
                      ? format(new Date(user.created_at), "MMM d, yyyy")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DialogTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => {
                                loadUserDetails(user.email);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DropdownMenuSeparator />
                          {user.blocked ? (
                            <DropdownMenuItem
                              onClick={() => handleUnblock(user.email)}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />{" "}
                              Unblock User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleBlock(user.email)}
                              disabled={user.is_admin}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />{" "}
                              Block User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>User Details</DialogTitle>
                        </DialogHeader>
                        {detailsLoading ? (
                          <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : userDetails ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  Email
                                </label>
                                <p className="font-semibold">
                                  {userDetails.user.email}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  Role
                                </label>
                                <p>
                                  {userDetails.user.is_admin ? "Admin" : "User"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  Status
                                </label>
                                <p>
                                  {userDetails.user.blocked
                                    ? "Blocked"
                                    : "Active"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                  Joined
                                </label>
                                <p>
                                  {userDetails.user.created_at
                                    ? format(
                                        new Date(userDetails.user.created_at),
                                        "PPpp",
                                      )
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Statistics</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-muted/50 p-4 border-none">
                                  <div className="text-2xl font-bold">
                                    {userDetails.stats.total_tasks}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Total Tasks
                                  </div>
                                </Card>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center py-4">
                            No details avaliable
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
        >
          Previous
        </Button>
        <div className="text-sm font-medium">
          Page {page} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
