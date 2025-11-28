import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";
import { calculateTimeRemaining } from "@/lib/time-utils";
import { TaskList } from "./task-list";

interface GlobalActivityCardProps {
  tasks: any[];
  localTaskUrls: string[];
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  nextTaskStatusUpdate?: string | null;
}

export function GlobalActivityCard({
  tasks,
  localTaskUrls,
  loading,
  error,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  nextTaskStatusUpdate,
}: Readonly<GlobalActivityCardProps>) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base">Global Activity</CardTitle>
        <CardDescription className="text-xs">
          Recent tasks added by all users
          {nextTaskStatusUpdate && (
            <div className="mt-1 flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Refreshes in:{" "}
                <span className="font-mono">
                  {calculateTimeRemaining(nextTaskStatusUpdate)}
                </span>
              </span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <TaskList
          tasks={tasks}
          localTaskUrls={localTaskUrls}
          loading={loading}
          error={error}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}
