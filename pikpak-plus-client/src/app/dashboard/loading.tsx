import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <Card className="w-full border-border/60">
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
