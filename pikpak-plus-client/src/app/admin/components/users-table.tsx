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
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthUser, UserStats } from "@/types/api";
import {
  getUsers,
  blockUser,
  unblockUser,
  getUserDetails,
  createUser,
  deleteUser,
  updateUserRole,
  bulkUserAction,
} from "@/lib/admin-client";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Search,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Eye,
  UserPlus,
  CheckSquare,
  Square,
  Trash2,
  Shield,
  AlertCircle,
  XCircle,
  CheckCircle2,
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
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
    new Set(),
  );
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [userDetails, setUserDetails] = useState<{
    user: AuthUser;
    stats: UserStats;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AuthUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers(page, pageSize, undefined, search);
      setUsers(res.data);
      setTotalCount(res.count);
      setTotalPages(Math.ceil(res.count / pageSize));
      setSelectedEmails(new Set());
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

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleBlock = async (email: string) => {
    if (!confirm(`Are you sure you want to block ${email}?`)) return;
    try {
      await blockUser(email);
      showFeedback("success", `User ${email} blocked successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Failed to block user", error);
      showFeedback("error", "Failed to block user");
    }
  };

  const handleUnblock = async (email: string) => {
    try {
      await unblockUser(email);
      showFeedback("success", `User ${email} unblocked successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Failed to unblock user", error);
      showFeedback("error", "Failed to unblock user");
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const isAdmin = formData.get("is_admin") === "on";
    try {
      await createUser(email, password, isAdmin);
      showFeedback("success", `User ${email} created successfully`);
      setShowCreateDialog(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to create user", error);
      showFeedback("error", "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.email === user?.email) {
      showFeedback("error", "You cannot delete your own account");
      setDeleteTarget(null);
      return;
    }
    setActionLoading(true);
    try {
      await deleteUser(deleteTarget.email);
      showFeedback(
        "success",
        `User ${deleteTarget.email} deleted successfully`,
      );
      setDeleteTarget(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to delete user", error);
      const message =
        error?.response?.data?.message || "Failed to delete user";
      showFeedback("error", message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleToggle = async () => {
    if (!roleTarget) return;
    if (roleTarget.email === user?.email) {
      showFeedback("error", "You cannot change your own role");
      setRoleTarget(null);
      return;
    }
    const newIsAdmin = !roleTarget.is_admin;
    const adminCount = users.filter((u) => u.is_admin).length;
    if (!newIsAdmin && adminCount <= 1) {
      showFeedback("error", "Cannot remove the last admin user");
      setRoleTarget(null);
      return;
    }
    setActionLoading(true);
    try {
      await updateUserRole(roleTarget.email, newIsAdmin);
      showFeedback(
        "success",
        `User ${roleTarget.email} is now ${newIsAdmin ? "an admin" : "a regular user"}`,
      );
      setRoleTarget(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update role", error);
      const message =
        error?.response?.data?.message || "Failed to update user role";
      showFeedback("error", message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedEmails.size === 0) return;
    const safeEmails = Array.from(selectedEmails).filter(
      (email) => email !== user?.email,
    );
    const unsafeEmails = Array.from(selectedEmails).filter(
      (email) => email === user?.email,
    );
    if (unsafeEmails.length > 0) {
      showFeedback(
        "error",
        "Cannot perform bulk action on your own account",
      );
      setBulkAction(null);
      return;
    }
    const adminEmails = users.filter(
      (u) => selectedEmails.has(u.email) && u.is_admin,
    );
    if (bulkAction === "delete" && adminEmails.length > 0) {
      showFeedback("error", "Cannot delete admin users");
      setBulkAction(null);
      return;
    }
    if (bulkAction === "block" && adminEmails.length > 0) {
      showFeedback("error", "Cannot block admin users");
      setBulkAction(null);
      return;
    }
    setActionLoading(true);
    try {
      await bulkUserAction(safeEmails, bulkAction);
      showFeedback(
        "success",
        `Bulk action completed for ${safeEmails.length} user(s)`,
      );
      setBulkAction(null);
      setSelectedEmails(new Set());
      fetchUsers();
    } catch (error) {
      console.error("Bulk action failed", error);
      showFeedback("error", "Bulk action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === users.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(users.map((u) => u.email)));
    }
  };

  const toggleSelect = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    setSelectedEmails(next);
  };

  const selectedCount = selectedEmails.size;
  const currentAdminCount = users.filter((u) => u.is_admin).length;

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
      {feedback && (
        <Alert
          variant={
            feedback.type === "error" ? "destructive" : "default"
          }
          className={
            feedback.type === "success"
              ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
              : ""
          }
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {feedback.type === "success" ? "Success" : "Error"}
          </AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => setFeedback(null)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
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
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Total Users: {totalCount}
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    name="is_admin"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor="is_admin"
                    className="text-sm font-medium"
                  >
                    Grant admin access
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedCount > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-medium">
              {selectedCount} user{selectedCount > 1 ? "s" : ""} selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkAction("block");
                }}
                disabled={
                  actionLoading ||
                  users.filter(
                    (u) =>
                      selectedEmails.has(u.email) && u.is_admin,
                  ).length > 0
                }
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Block Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAction("unblock")}
                disabled={actionLoading}
              >
                <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                Unblock Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkAction("delete")}
                disabled={
                  actionLoading ||
                  users.filter(
                    (u) =>
                      selectedEmails.has(u.email) && u.is_admin,
                  ).length > 0
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedEmails(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the user{" "}
                <span className="font-semibold">{deleteTarget.email}</span>?
              </p>
              {deleteTarget.email === user?.email && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    You cannot delete your own account.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={actionLoading || deleteTarget?.email === user?.email}
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {roleTarget?.is_admin
                ? "Remove Admin Access"
                : "Grant Admin Access"}
            </DialogTitle>
          </DialogHeader>
          {roleTarget && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {roleTarget.is_admin
                  ? `Remove admin access from ${roleTarget.email}?`
                  : `Grant admin access to ${roleTarget.email}?`}
              </p>
              {!roleTarget.is_admin &&
                currentAdminCount <= 1 && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>
                      Cannot remove last admin
                    </AlertTitle>
                    <AlertDescription>
                      This is the only admin user. You must assign
                      another admin before changing this role.
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRoleToggle}
              disabled={
                actionLoading ||
                roleTarget?.email === user?.email ||
                (!roleTarget?.is_admin && currentAdminCount <= 1)
              }
            >
              {actionLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={toggleSelectAll}
                >
                  {selectedEmails.size === users.length && users.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((userItem) => (
                <TableRow key={userItem.email}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleSelect(userItem.email)}
                    >
                      {selectedEmails.has(userItem.email) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    {userItem.email}
                  </TableCell>
                  <TableCell>
                    {userItem.is_admin ? (
                      <Badge variant="default" className="bg-purple-600">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {userItem.blocked ? (
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
                    {userItem.created_at
                      ? format(
                          new Date(userItem.created_at),
                          "MMM d, yyyy",
                        )
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
                                setSelectedUser(userItem);
                                loadUserDetails(userItem.email);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DropdownMenuSeparator />
                          {userItem.blocked ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleUnblock(userItem.email)
                              }
                            >
                              <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                              Unblock User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                handleBlock(userItem.email)
                              }
                              disabled={userItem.is_admin}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                              Block User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setRoleTarget(userItem)}
                            disabled={
                              userItem.email === user?.email ||
                              (!userItem.is_admin &&
                                currentAdminCount <= 1)
                            }
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            {userItem.is_admin
                              ? "Remove Admin"
                              : "Make Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(userItem)}
                            disabled={userItem.email === user?.email}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
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
                                  {userDetails.user.is_admin
                                    ? "Admin"
                                    : "User"}
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
                                        new Date(
                                          userDetails.user.created_at,
                                        ),
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
