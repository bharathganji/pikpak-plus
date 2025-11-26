import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
}: GlobalActivityCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base">Global Activity</CardTitle>
        <CardDescription className="text-xs">
          Recent tasks added by all users
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