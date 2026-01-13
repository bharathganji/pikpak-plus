"use client";

import { useAuth } from "@/components/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardOverview } from "./components/dashboard-overview";
import { UsersTable } from "./components/users-table";
import { ContentModeration } from "./components/content-moderation";
import { Activity, Users, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();

  // Redirect is handled by AuthProvider, but we can show loading meanwhile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // AuthProvider will redirect
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system users, content, and view analytics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to App
          </Button>
          <Button variant="destructive" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="overview" className="flex gap-2">
            <Activity className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex gap-2">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="content" className="flex gap-2">
            <FileText className="h-4 w-4" /> Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="users">
          <UsersTable />
        </TabsContent>

        <TabsContent value="content">
          <ContentModeration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
