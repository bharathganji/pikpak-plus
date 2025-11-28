"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Fab } from "@/components/layout/fab";
import { CreateShareTab } from "@/components/features/create-share/create-share-tab";
import { DownloadsTab } from "@/components/features/downloads/downloads-tab";
import { MyActivityTab } from "@/components/features/downloads/my-activity-tab";
import { DisclaimerModal } from "@/components/disclaimer-modal";

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center p-2 md:p-4 lg:p-8 
      bg-linear-to-b from-background to-muted/20 overflow-x-hidden w-full"
    >
      <Header />

      <Tabs defaultValue="create" className="w-full max-w-6xl">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="create">Create & Share</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          <TabsTrigger value="my-activity">My Activity</TabsTrigger>
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
