/**
 * Pagination info component with page size selector and item count
 */

import React from "react";
import { useItemRange } from "../hooks/use-task-list";

interface PaginationInfoProps {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly onPageSizeChange: (pageSize: number) => void;
}

export const PaginationInfo = React.memo(function PaginationInfo({
  page,
  pageSize,
  totalItems,
  onPageSizeChange,
}: Readonly<PaginationInfoProps>) {
  const { itemRange, showItemRange } = useItemRange(page, pageSize, totalItems);

  if (!showItemRange) {
    return null;
  }

  return (
    <div className="flex items-center gap-3.5 flex-wrap justify-center w-full text-xs text-muted-foreground">
      <span className="font-medium">
        Showing <span className="text-foreground font-semibold">{itemRange.start}</span>–<span className="text-foreground font-semibold">{itemRange.end}</span> of{" "}
        <span className="text-foreground font-semibold">{itemRange.total}</span> tasks
      </span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-7.5 rounded-lg border border-border/60 bg-card px-2.5 text-xs text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all cursor-pointer"
      >
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
        <option value={100}>100 / page</option>
      </select>
    </div>
  );
});
