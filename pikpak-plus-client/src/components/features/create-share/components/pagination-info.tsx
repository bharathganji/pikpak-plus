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
    <div className="flex items-center gap-4 flex-wrap justify-center w-full text-xs text-muted-foreground">
      <span>
        Showing {itemRange.start}-{itemRange.end} of {itemRange.total} tasks
      </span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
        <option value={100}>100 / page</option>
      </select>
    </div>
  );
});
