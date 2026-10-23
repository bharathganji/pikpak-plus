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
        <div className="grid w-full grid-cols-4 gap-2 mb-4 p-1 rounded-lg bg-muted/40">
          <Skeleton className="h-9 rounded-md" />
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
            {/* List Item Skeletons */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Skeleton className="h-5 w-5 rounded shrink-0" />
                  <div className="space-y-1.5 flex-1 max-w-md">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 pl-2">
                  <Skeleton className="h-4 w-16 hidden sm:block" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
