"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuthUser, UserStats } from "@/types/api";
import {
  getUsers,
  blockUser,
  unblockUser,
  getUserDetails,
} from "@/lib/admin-client";
import {
  Loader2,
  Search,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UsersTable() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [userDetails, setUserDetails] = useState<{
    user: AuthUser;
    stats: UserStats;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers(page, pageSize, undefined, search);
      setUsers(res.data);
      setTotalCount(res.count);
      setTotalPages(Math.ceil(res.count / pageSize));
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBlock = async (email: string) => {
    if (!confirm(`Are you sure you want to block ${email}?`)) return;
    try {
      await blockUser(email);
      // Refresh list
      fetchUsers();
    } catch (error) {
      console.error("Failed to block user", error);
      alert("Failed to block user");
    }
  };

  const handleUnblock = async (email: string) => {
    try {
      await unblockUser(email);
      fetchUsers();
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
                        className="text-green-600 bg-green-100 dark:bg-green-900/30"
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
                                setSelectedUser(user);
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
          onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
