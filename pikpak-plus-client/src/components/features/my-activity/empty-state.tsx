import { Clock } from "lucide-react";

export function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium">No recent activity</p>
      <p className="text-sm mt-2">
        Tasks you add will appear here until you delete them
      </p>
    </div>
  );
}
