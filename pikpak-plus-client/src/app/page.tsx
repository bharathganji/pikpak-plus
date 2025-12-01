"use client";

import { useLocalStorage } from "primereact/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Fab } from "@/components/layout/fab";
import { CreateShareTab } from "@/components/features/create-share/create-share-tab";
import { DownloadsTab } from "@/components/features/downloads/downloads-tab";
import { MyActivityTab } from "@/components/features/downloads/my-activity-tab";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { Share2, Download, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LOCAL_TASKS_STORAGE_KEY } from "@/components/features/my-activity/types";

export default function Home() {
  const [localTasks] = useLocalStorage<any[]>([], LOCAL_TASKS_STORAGE_KEY);

  return (
    <main
      className="flex min-h-screen flex-col items-center p-2 md:p-4 lg:p-8 
      bg-linear-to-b from-background to-muted/20 overflow-x-hidden w-full"
    >
      <Header />

      <Tabs defaultValue="create" className="w-full max-w-6xl">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="create" className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Create & Share</span>
            <span className="sm:hidden">Create</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Downloads</span>
          </TabsTrigger>
          <TabsTrigger value="my-activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">My Activity</span>
            <span className="sm:hidden">Activity</span>
            {localTasks.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-5 px-1.5 rounded-full text-[10px] flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20"
              >
                {localTasks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="w-full max-w-full">
          <CreateShareTab />
        </TabsContent>

        <TabsContent value="downloads" className="w-full max-w-full">
          <DownloadsTab />
        </TabsContent>

        <TabsContent value="my-activity" className="w-full max-w-full">
          <MyActivityTab />
        </TabsContent>
      </Tabs>

      <Footer />
      <Fab />
      <DisclaimerModal />
    </main>
  );
}
