/**
 * Filter controls component for task list
 */

import React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FilterControlsProps {
  readonly showMyTasksOnly: boolean;
  readonly onFilterChange: (show: boolean) => void;
  readonly nsfwFilterEnabled: boolean;
  readonly onNsfwFilterToggle: () => void;
  readonly filteredCount?: number;
}

export const FilterControls = React.memo(function FilterControls({
  showMyTasksOnly,
  onFilterChange,
  nsfwFilterEnabled,
  onNsfwFilterToggle,
  filteredCount,
}: Readonly<FilterControlsProps>) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant={showMyTasksOnly ? "default" : "outline"}
        size="sm"
        onClick={() => onFilterChange(!showMyTasksOnly)}
        className="gap-2 h-8"
      >
        <Filter className="h-3 w-3" />
        {showMyTasksOnly ? "Show All Tasks" : "My Tasks Only"}
      </Button>
      <Button
        variant={nsfwFilterEnabled ? "default" : "outline"}
        size="sm"
        onClick={onNsfwFilterToggle}
        className="gap-2 h-8 relative"
      >
        <Filter className="h-3 w-3" />
        NSFW Filter
        {nsfwFilterEnabled && filteredCount !== undefined && filteredCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white border-0"
          >
            {filteredCount}
          </Badge>
        )}
      </Button>
    </div>
  );
});
