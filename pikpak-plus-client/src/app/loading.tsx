import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <main
      className="flex min-h-screen flex-col items-center p-2 md:p-4 lg:p-8 
      bg-linear-to-b from-background to-muted/20 overflow-x-hidden w-full"
    >
      {/* Responsive Header Skeleton */}
      <header className="w-full max-w-6xl flex items-center justify-between py-4 mb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </header>

      {/* Responsive Tabs Skeleton */}
      <div className="w-full max-w-6xl space-y-4">
        <div className="grid w-full grid-cols-3 max-w-2xl mx-auto gap-2 mb-4 p-1 rounded-xl bg-muted/40">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>

        {/* Content Card Skeleton */}
        <Card className="w-full border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="space-y-3 pb-4 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>

            {/* Breadcrumb / Filter row skeleton */}
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>

            <Skeleton className="h-9 w-full rounded-md" />
          </CardHeader>

          <CardContent className="pt-4 space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
