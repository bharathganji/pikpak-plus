"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from "./components/dashboard-overview";
import { UsersTable } from "./components/users-table";
import { ContentModeration } from "./components/content-moderation";
import { SystemSettings } from "./components/system-settings";
import { Activity, Users, FileText, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  // Show responsive admin skeleton while loading
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-11 w-full max-w-[620px] rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // AuthProvider will redirect
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-2 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Administration Portal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage system users, content, and view analytics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="border-border/80 hover:bg-muted/60 transition-colors shadow-xs"
          >
            Back to App
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loggingOut}
            className="shadow-xs"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-[620px] bg-muted/60 p-1.5 rounded-xl border border-border/60 backdrop-blur-sm shadow-xs">
          <TabsTrigger
            value="overview"
            className="flex items-center justify-center gap-2 rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all font-medium text-xs sm:text-sm"
          >
            <Activity className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="flex items-center justify-center gap-2 rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all font-medium text-xs sm:text-sm"
          >
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger
            value="content"
            className="flex items-center justify-center gap-2 rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all font-medium text-xs sm:text-sm"
          >
            <FileText className="h-4 w-4" /> Content
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center justify-center gap-2 rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all font-medium text-xs sm:text-sm"
          >
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ErrorBoundary title="Failed to load Overview">
            <DashboardOverview />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="users">
          <ErrorBoundary title="Failed to load Users Table">
            <UsersTable />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="content">
          <ErrorBoundary title="Failed to load Content Moderation">
            <ContentModeration />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="settings">
          <ErrorBoundary title="Failed to load System Settings">
            <SystemSettings />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
