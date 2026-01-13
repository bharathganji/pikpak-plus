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
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  nextTaskStatusUpdate?: string | null;
}

export function GlobalActivityCard({
  tasks,
  loading,
  error,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  nextTaskStatusUpdate,
}: Readonly<GlobalActivityCardProps>) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base">My Activity</CardTitle>
        <CardDescription className="text-xs">
          Recent tasks you added
          {nextTaskStatusUpdate && (
            <span className="mt-1 flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Progress Refreshes in:{" "}
                <span className="font-mono">
                  {calculateTimeRemaining(nextTaskStatusUpdate)}
                </span>
              </span>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-0.5 pb-4">
        <TaskList
          tasks={tasks}
          loading={loading}
          error={error}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}
