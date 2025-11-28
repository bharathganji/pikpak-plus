"use client";

import { Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityCardHeaderProps {
  taskCount: number;
  onClearAll: () => void;
}

export function ActivityCardHeader({
  taskCount,
  onClearAll,
}: Readonly<ActivityCardHeaderProps>) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            My Activity
          </CardTitle>
          <CardDescription>Tasks you've added (stored locally)</CardDescription>
        </div>
        {taskCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onClearAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
    </CardHeader>
  );
}
