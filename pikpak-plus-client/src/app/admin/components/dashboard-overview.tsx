"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminStats, DailyStats } from "@/types/api";
import { getOverviewStats, getDailyStats } from "@/lib/admin-client";
import {
  Users,
  UserCheck,
  UserX,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface DashboardData {
  stats: AdminStats;
  dailyStats: DailyStats[];
}

export function DashboardOverview() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => {
      const [overviewData, dailyData] = await Promise.all([
        getOverviewStats(),
        getDailyStats(14), // Last 14 days
      ]);
      return {
        stats: overviewData,
        dailyStats: dailyData.data || [],
      };
    },
  });

  const stats = data?.stats ?? null;
  const dailyStats = data?.dailyStats ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-border/60 bg-card/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </CardHeader>
              <CardContent className="space-y-1.5">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-border/60 bg-card/80 shadow-xs">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/80 shadow-xs">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border border-border/60 p-8 text-center text-muted-foreground shadow-xs">
        Failed to load statistics
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.active_users}</div>
            <p className="text-xs text-muted-foreground mt-1">Unrestricted access</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked Users</CardTitle>
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
              <UserX className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-destructive">{stats.blocked_users}</div>
            <p className="text-xs text-muted-foreground mt-1">Suspended access</p>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Content Items</CardTitle>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">{stats.total_tasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_logs} system logs recorded
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border) / 0.8)",
                      backgroundColor: "hsl(var(--card))",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "8px" }} />
                  <Line
                    type="monotone"
                    dataKey="tasks_added"
                    stroke="#ffc658"
                    name="Tasks Added"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Resource Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => formatBytes(val)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border) / 0.8)",
                      backgroundColor: "hsl(var(--card))",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                    }}
                    formatter={(val: unknown) => formatBytes(typeof val === "number" ? val : 0)}
                  />
                  <Legend wrapperStyle={{ paddingTop: "8px" }} />
                  <Line
                    type="monotone"
                    dataKey="storage_used"
                    stroke="#8884d8"
                    name="Storage"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="downstream_traffic"
                    stroke="#82ca9d"
                    name="Downstream"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="transfer_used"
                    stroke="#ff7300"
                    name="Transfer"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { DashboardOverview as AdminOverview };
