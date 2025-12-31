/**
 * Utility functions for pagination logic
 */

// Pagination component variants
export type PaginationVariant = "full" | "minimal" | "dropdown";

// Pagination state interface
export interface PaginationState {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly pageSize: number;
  readonly totalItems: number;
}

// Pagination configuration interface
export interface PaginationConfig {
  readonly variant?: PaginationVariant;
  readonly showPageInfo?: boolean;
  readonly showPageSizeSelector?: boolean;
  readonly showItemCount?: boolean;
  readonly maxVisiblePages?: number;
  readonly className?: string;
}

// Helper function to generate page numbers with ellipsis
export function generatePageNumbers(
  current: number,
  total: number,
  maxVisiblePages: number = 7,
): (number | string)[] {
  if (total <= maxVisiblePages) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  const showPages = Math.floor((maxVisiblePages - 4) / 2); // Pages to show on each side of current

  // Always show first page
  pages.push(1);

  if (current > showPages + 2) {
    pages.push("...");
  }

  // Calculate start and end of page range
  const start = Math.max(2, current - showPages);
  const end = Math.min(total - 1, current + showPages);

  // Add page numbers around current page
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - showPages - 1) {
    pages.push("...");
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

// Calculate item range for display
export function calculateItemRange(
  currentPage: number,
  pageSize: number,
  totalItems: number,
): { start: number; end: number; total: number } {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return {
    start,
    end,
    total: totalItems,
  };
}

// Validate page number
export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages;
}

// Select optimal pagination variant based on total pages
export function selectPaginationVariant(
  totalPages: number,
  userPreference?: PaginationVariant,
): PaginationVariant {
  if (userPreference) {
    return userPreference;
  }

  if (totalPages <= 5) {
    return "dropdown";
  }

  return "full";
}

// Calculate animation delay for list items
export function calculateAnimationDelay(
  index: number,
  baseDelay: number = 0.05,
): string {
  return `${index * baseDelay}s`;
}
