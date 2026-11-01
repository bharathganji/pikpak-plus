/**
 * Filter controls component for task list
 */

import React from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FilterControlsProps {
  readonly nsfwFilterEnabled: boolean;
  readonly onNsfwFilterToggle: () => void;
  readonly filteredCount?: number;
}

export const FilterControls = React.memo(function FilterControls({
  nsfwFilterEnabled,
  onNsfwFilterToggle,
  filteredCount,
}: Readonly<FilterControlsProps>) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant={nsfwFilterEnabled ? "default" : "outline"}
        size="sm"
        onClick={onNsfwFilterToggle}
        className="gap-2 h-8 rounded-full px-3.5 text-xs font-medium relative transition-all shadow-xs hover:shadow-sm"
      >
        <Filter className="h-3.5 w-3.5" />
        <span>NSFW Filter</span>
        {nsfwFilterEnabled &&
          filteredCount !== undefined &&
          filteredCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground border border-background shadow-xs"
            >
              {filteredCount}
            </Badge>
          )}
      </Button>
    </div>
  );
});
