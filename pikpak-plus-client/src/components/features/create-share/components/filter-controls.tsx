/**
 * Filter controls component for task list
 */

import React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterControlsProps {
  readonly showMyTasksOnly: boolean;
  readonly onFilterChange: (show: boolean) => void;
  readonly nsfwFilterEnabled: boolean;
  readonly onNsfwFilterToggle: () => void;
}

export const FilterControls = React.memo(function FilterControls({
  showMyTasksOnly,
  onFilterChange,
  nsfwFilterEnabled,
  onNsfwFilterToggle,
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
        className="gap-2 h-8"
      >
        <Filter className="h-3 w-3" />
        NSFW Filter
      </Button>
    </div>
  );
});
