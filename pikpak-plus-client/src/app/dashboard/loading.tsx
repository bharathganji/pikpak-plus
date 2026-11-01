import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <Card className="w-full rounded-2xl border-border/60 bg-card shadow-xs">
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
            <Skeleton className="h-4 w-14 rounded-full" />
            <span className="text-muted-foreground/40 text-xs">/</span>
            <Skeleton className="h-4 w-4 rounded-full" />
            <span className="text-muted-foreground/40 text-xs">/</span>
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
